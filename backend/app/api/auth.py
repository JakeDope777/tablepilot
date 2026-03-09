"""
Authentication API endpoints.

POST /auth/signup - Register new users
POST /auth/login  - Authenticate existing users
POST /auth/refresh - Refresh access token
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from ..core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from ..core.config import settings
from ..core.dependencies import get_current_user
from ..db.session import get_db
from ..db import models
from ..db.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SendVerificationRequest,
    VerifyEmailRequest,
    ProfileUpdateRequest,
    MessageResponse,
)
from ..services.emailer import send_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _optional_user(
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
) -> Optional[models.User]:
    """Resolve authenticated user when Authorization header is present."""
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(models.User).filter(models.User.id == user_id).first()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and return access/refresh tokens."""
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create user
    user = models.User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="user",
        is_email_verified=False,
    )
    db.add(user)
    db.flush()

    # Create token account
    token_account = models.TokenAccount(
        user_id=user.id,
        balance=settings.FREE_TIER_MONTHLY_TOKENS,
        tier="free",
    )
    db.add(token_account)
    db.commit()
    db.refresh(user)

    verification_token = _create_email_verification_token(db, user.id)
    _send_verification_email(user.email, verification_token)

    # Generate tokens
    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return access/refresh tokens."""
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required before login",
        )

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh an access token using a valid refresh token."""
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    token_data = {"sub": user.id, "email": user.email, "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user),
):
    """Get the current authenticated user's information."""
    return current_user


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Issue password reset token and send reset email."""
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if user:
        reset_token = _create_password_reset_token(db, user.id)
        _send_password_reset_email(user.email, reset_token)
    # Do not leak whether account exists.
    return MessageResponse(message="If this email exists, reset instructions were sent.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password with valid reset token."""
    token_record = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token == request.token)
        .first()
    )
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    now = datetime.now(timezone.utc)
    if token_record.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Reset token already used")
    if token_record.expires_at < now:
        raise HTTPException(status_code=400, detail="Reset token expired")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(request.new_password)
    token_record.consumed_at = now
    db.commit()
    return MessageResponse(message="Password reset successfully.")


@router.post("/send-verification", response_model=MessageResponse)
async def send_verification(
    request: Optional[SendVerificationRequest] = None,
    current_user: Optional[models.User] = Depends(_optional_user),
    db: Session = Depends(get_db),
):
    """Send a fresh email verification link."""
    target_user = current_user
    if target_user is None and request and request.email:
        target_user = db.query(models.User).filter(models.User.email == request.email).first()

    # For unauthenticated flows, keep response generic to avoid account enumeration.
    if target_user is None:
        return MessageResponse(message="If this email exists, a verification email was sent.")

    if target_user.is_email_verified:
        return MessageResponse(message="Email already verified.")

    verification_token = _create_email_verification_token(db, target_user.id)
    _send_verification_email(target_user.email, verification_token)
    return MessageResponse(message="Verification email sent.")


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    request: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """Verify user email by one-time token."""
    token_record = (
        db.query(models.EmailVerificationToken)
        .filter(models.EmailVerificationToken.token == request.token)
        .first()
    )
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    now = datetime.now(timezone.utc)
    if token_record.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Verification token already used")
    if token_record.expires_at < now:
        raise HTTPException(status_code=400, detail="Verification token expired")

    user = db.query(models.User).filter(models.User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_email_verified = True
    token_record.consumed_at = now
    db.commit()
    return MessageResponse(message="Email verified successfully.")


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile fields."""
    if request.full_name is not None:
        current_user.full_name = request.full_name.strip() or None
    if request.company is not None:
        current_user.company = request.company.strip() or None
    if request.timezone is not None:
        current_user.timezone = request.timezone.strip() or None
    db.commit()
    db.refresh(current_user)
    return current_user


def _create_email_verification_token(db: Session, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)
    record = models.EmailVerificationToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(record)
    db.commit()
    return token


def _create_password_reset_token(db: Session, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    record = models.PasswordResetToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(record)
    db.commit()
    return token


def _send_verification_email(email: str, token: str) -> None:
    verify_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/verify-email?token={token}"
    send_email(
        to_email=email,
        subject="Verify your TablePilot AI email",
        body_text=(
            "Welcome to TablePilot AI.\n\n"
            f"Verify your email by opening:\n{verify_url}\n\n"
            "If you did not request this, you can ignore this email."
        ),
    )


def _send_password_reset_email(email: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?token={token}"
    send_email(
        to_email=email,
        subject="Reset your TablePilot AI password",
        body_text=(
            "We received a request to reset your password.\n\n"
            f"Reset link:\n{reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        ),
    )
