"""Create Tahr Air airports, flights, and bookings.

Revision ID: 8f4c2d1a7b90
Revises: fe56fa70289e
Create Date: 2026-08-07
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "8f4c2d1a7b90"
down_revision = "fe56fa70289e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("item")
    op.create_table(
        "airport",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=3), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.CheckConstraint("code = upper(code)", name="ck_airport_code_uppercase"),
        sa.CheckConstraint("char_length(code) = 3", name="ck_airport_code_length"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_airport_code", "airport", ["code"], unique=True)
    op.create_table(
        "flight",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("flight_number", sa.String(length=12), nullable=False),
        sa.Column("origin_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("destination_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("departure_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrival_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("total_capacity", sa.Integer(), nullable=False),
        sa.Column("available_capacity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.CheckConstraint(
            "origin_id <> destination_id", name="ck_flight_distinct_airports"
        ),
        sa.CheckConstraint("arrival_at > departure_at", name="ck_flight_time_order"),
        sa.CheckConstraint("price_cents > 0", name="ck_flight_positive_price"),
        sa.CheckConstraint("total_capacity > 0", name="ck_flight_positive_capacity"),
        sa.CheckConstraint(
            "available_capacity >= 0 AND available_capacity <= total_capacity",
            name="ck_flight_available_capacity",
        ),
        sa.CheckConstraint("currency = 'CAD'", name="ck_flight_currency_cad"),
        sa.CheckConstraint(
            "status IN ('scheduled', 'cancelled')", name="ck_flight_status"
        ),
        sa.ForeignKeyConstraint(["origin_id"], ["airport.id"]),
        sa.ForeignKeyConstraint(["destination_id"], ["airport.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "flight_number", "departure_at", name="uq_flight_number_departure"
        ),
    )
    op.create_index("ix_flight_flight_number", "flight", ["flight_number"])
    op.create_index(
        "ix_flight_route_departure_status",
        "flight",
        ["origin_id", "destination_id", "departure_at", "status"],
    )
    op.create_table(
        "booking",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("booking_reference", sa.String(length=17), nullable=False),
        sa.Column("flight_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("passenger_name", sa.String(length=160), nullable=False),
        sa.Column("passenger_email", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("booked_price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('confirmed', 'cancelled')", name="ck_booking_status"
        ),
        sa.CheckConstraint(
            "booked_price_cents > 0", name="ck_booking_positive_price"
        ),
        sa.CheckConstraint("currency = 'CAD'", name="ck_booking_currency_cad"),
        sa.ForeignKeyConstraint(["flight_id"], ["flight.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_booking_booking_reference", "booking", ["booking_reference"], unique=True
    )
    op.create_index("ix_booking_flight_status", "booking", ["flight_id", "status"])
    op.create_index("ix_booking_email", "booking", ["passenger_email"])


def downgrade() -> None:
    op.drop_table("booking")
    op.drop_table("flight")
    op.drop_table("airport")
    op.create_table(
        "item",
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
