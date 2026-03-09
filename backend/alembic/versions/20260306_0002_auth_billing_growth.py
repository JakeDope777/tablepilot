"""Auth, billing, and growth schema updates.

Revision ID: 20260306_0002
Revises: 20260306_0001
Create Date: 2026-03-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260306_0002"
down_revision: Union[str, None] = "20260306_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(), nullable=True))
    op.add_column("users", sa.Column("company", sa.String(), nullable=True))
    op.add_column("users", sa.Column("timezone", sa.String(), nullable=True))
    op.add_column("users", sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.text("0")))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_users_stripe_customer_id"), "users", ["stripe_customer_id"], unique=False)

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_verification_tokens_user_id"), "email_verification_tokens", ["user_id"], unique=False)
    op.create_index(op.f("ix_email_verification_tokens_token"), "email_verification_tokens", ["token"], unique=True)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"], unique=False)
    op.create_index(op.f("ix_password_reset_tokens_token"), "password_reset_tokens", ["token"], unique=True)

    op.create_table(
        "billing_subscriptions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("stripe_price_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_billing_subscriptions_user_id"), "billing_subscriptions", ["user_id"], unique=True)
    op.create_index(op.f("ix_billing_subscriptions_stripe_subscription_id"), "billing_subscriptions", ["stripe_subscription_id"], unique=False)
    op.create_index(op.f("ix_billing_subscriptions_stripe_customer_id"), "billing_subscriptions", ["stripe_customer_id"], unique=False)

    op.create_table(
        "billing_invoices",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("stripe_invoice_id", sa.String(), nullable=True),
        sa.Column("amount_due", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(), nullable=False, server_default="usd"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("hosted_invoice_url", sa.Text(), nullable=True),
        sa.Column("invoice_pdf", sa.Text(), nullable=True),
        sa.Column("period_start", sa.DateTime(), nullable=True),
        sa.Column("period_end", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_billing_invoices_user_id"), "billing_invoices", ["user_id"], unique=False)
    op.create_index(op.f("ix_billing_invoices_stripe_invoice_id"), "billing_invoices", ["stripe_invoice_id"], unique=True)

    op.create_table(
        "growth_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("event_name", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_growth_events_user_id"), "growth_events", ["user_id"], unique=False)
    op.create_index(op.f("ix_growth_events_event_name"), "growth_events", ["event_name"], unique=False)
    op.create_index(op.f("ix_growth_events_created_at"), "growth_events", ["created_at"], unique=False)

    op.create_table(
        "waitlist_leads",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("utm_source", sa.String(), nullable=True),
        sa.Column("utm_medium", sa.String(), nullable=True),
        sa.Column("utm_campaign", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_waitlist_leads_email"), "waitlist_leads", ["email"], unique=True)
    op.create_index(op.f("ix_waitlist_leads_created_at"), "waitlist_leads", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_waitlist_leads_created_at"), table_name="waitlist_leads")
    op.drop_index(op.f("ix_waitlist_leads_email"), table_name="waitlist_leads")
    op.drop_table("waitlist_leads")

    op.drop_index(op.f("ix_growth_events_created_at"), table_name="growth_events")
    op.drop_index(op.f("ix_growth_events_event_name"), table_name="growth_events")
    op.drop_index(op.f("ix_growth_events_user_id"), table_name="growth_events")
    op.drop_table("growth_events")

    op.drop_index(op.f("ix_billing_invoices_stripe_invoice_id"), table_name="billing_invoices")
    op.drop_index(op.f("ix_billing_invoices_user_id"), table_name="billing_invoices")
    op.drop_table("billing_invoices")

    op.drop_index(op.f("ix_billing_subscriptions_stripe_customer_id"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_stripe_subscription_id"), table_name="billing_subscriptions")
    op.drop_index(op.f("ix_billing_subscriptions_user_id"), table_name="billing_subscriptions")
    op.drop_table("billing_subscriptions")

    op.drop_index(op.f("ix_password_reset_tokens_token"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_user_id"), table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")

    op.drop_index(op.f("ix_email_verification_tokens_token"), table_name="email_verification_tokens")
    op.drop_index(op.f("ix_email_verification_tokens_user_id"), table_name="email_verification_tokens")
    op.drop_table("email_verification_tokens")

    op.drop_index(op.f("ix_users_stripe_customer_id"), table_name="users")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "is_email_verified")
    op.drop_column("users", "timezone")
    op.drop_column("users", "company")
    op.drop_column("users", "full_name")
