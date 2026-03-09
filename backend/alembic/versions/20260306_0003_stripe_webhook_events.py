"""Add Stripe webhook event idempotency table.

Revision ID: 20260306_0003
Revises: 20260306_0002
Create Date: 2026-03-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260306_0003"
down_revision: Union[str, None] = "20260306_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("stripe_event_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload_hash", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="processing"),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stripe_webhook_events_stripe_event_id"), "stripe_webhook_events", ["stripe_event_id"], unique=True)
    op.create_index(op.f("ix_stripe_webhook_events_event_type"), "stripe_webhook_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_stripe_webhook_events_status"), "stripe_webhook_events", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stripe_webhook_events_status"), table_name="stripe_webhook_events")
    op.drop_index(op.f("ix_stripe_webhook_events_event_type"), table_name="stripe_webhook_events")
    op.drop_index(op.f("ix_stripe_webhook_events_stripe_event_id"), table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
