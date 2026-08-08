import uuid
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import EmailStr, field_validator, model_validator
from sqlalchemy import CheckConstraint, Column, DateTime, Index, UniqueConstraint
from sqlmodel import Field, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class FlightStatus(StrEnum):
    scheduled = "scheduled"
    cancelled = "cancelled"


class EffectiveFlightStatus(StrEnum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    departed = "departed"


class BookingStatus(StrEnum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class Airport(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint("code = upper(code)", name="ck_airport_code_uppercase"),
        CheckConstraint("char_length(code) = 3", name="ck_airport_code_length"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True, index=True, min_length=3, max_length=3)
    city: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=1, max_length=180)
    timezone: str = Field(min_length=1, max_length=64)


class AirportPublic(SQLModel):
    id: uuid.UUID
    code: str
    city: str
    country: str
    name: str
    timezone: str


class AirportsPublic(SQLModel):
    data: list[AirportPublic]
    count: int


class Flight(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "flight_number", "departure_at", name="uq_flight_number_departure"
        ),
        CheckConstraint(
            "origin_id <> destination_id", name="ck_flight_distinct_airports"
        ),
        CheckConstraint("arrival_at > departure_at", name="ck_flight_time_order"),
        CheckConstraint("price_cents > 0", name="ck_flight_positive_price"),
        CheckConstraint("total_capacity > 0", name="ck_flight_positive_capacity"),
        CheckConstraint(
            "available_capacity >= 0 AND available_capacity <= total_capacity",
            name="ck_flight_available_capacity",
        ),
        CheckConstraint("currency = 'CAD'", name="ck_flight_currency_cad"),
        CheckConstraint(
            "status IN ('scheduled', 'cancelled')", name="ck_flight_status"
        ),
        Index(
            "ix_flight_route_departure_status",
            "origin_id",
            "destination_id",
            "departure_at",
            "status",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    flight_number: str = Field(min_length=3, max_length=12, index=True)
    origin_id: uuid.UUID = Field(foreign_key="airport.id", nullable=False)
    destination_id: uuid.UUID = Field(foreign_key="airport.id", nullable=False)
    departure_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    arrival_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    price_cents: int = Field(gt=0)
    currency: str = Field(default="CAD", max_length=3)
    total_capacity: int = Field(gt=0)
    available_capacity: int = Field(ge=0)
    status: FlightStatus = Field(default=FlightStatus.scheduled, max_length=16)


class FlightInputBase(SQLModel):
    flight_number: str = Field(min_length=3, max_length=12)
    origin_id: uuid.UUID
    destination_id: uuid.UUID
    departure_at: datetime
    arrival_at: datetime
    price_cents: int = Field(gt=0)
    total_capacity: int = Field(gt=0)

    @field_validator("flight_number")
    @classmethod
    def normalize_flight_number(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not 3 <= len(normalized) <= 12:
            raise ValueError("Flight number must contain 3 to 12 characters")
        return normalized


class FlightCreate(FlightInputBase):
    pass


class FlightUpdate(SQLModel):
    flight_number: str | None = Field(default=None, min_length=3, max_length=12)
    origin_id: uuid.UUID | None = None
    destination_id: uuid.UUID | None = None
    departure_at: datetime | None = None
    arrival_at: datetime | None = None
    price_cents: int | None = Field(default=None, gt=0)
    total_capacity: int | None = Field(default=None, gt=0)
    status: FlightStatus | None = None

    @field_validator("flight_number")
    @classmethod
    def normalize_flight_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not 3 <= len(normalized) <= 12:
            raise ValueError("Flight number must contain 3 to 12 characters")
        return normalized

    @model_validator(mode="after")
    def reject_explicit_nulls(self) -> FlightUpdate:
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Flight update fields cannot be null")
        return self


class FlightPublic(SQLModel):
    id: uuid.UUID
    flight_number: str
    origin: AirportPublic
    destination: AirportPublic
    departure_at: datetime
    arrival_at: datetime
    price_cents: int
    currency: str
    total_capacity: int
    available_capacity: int
    status: FlightStatus
    effective_status: EffectiveFlightStatus


class FlightsPublic(SQLModel):
    data: list[FlightPublic]
    count: int


class Booking(SQLModel, table=True):
    __table_args__ = (
        CheckConstraint(
            "status IN ('confirmed', 'cancelled')", name="ck_booking_status"
        ),
        CheckConstraint("booked_price_cents > 0", name="ck_booking_positive_price"),
        CheckConstraint("currency = 'CAD'", name="ck_booking_currency_cad"),
        Index("ix_booking_flight_status", "flight_id", "status"),
        Index("ix_booking_email", "passenger_email"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    booking_reference: str = Field(
        unique=True, index=True, min_length=17, max_length=17
    )
    flight_id: uuid.UUID = Field(foreign_key="flight.id", nullable=False)
    passenger_name: str = Field(min_length=1, max_length=160)
    passenger_email: str = Field(max_length=255)
    status: BookingStatus = Field(default=BookingStatus.confirmed, max_length=16)
    booked_price_cents: int = Field(gt=0)
    currency: str = Field(default="CAD", max_length=3)
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class BookingCreate(SQLModel):
    flight_id: uuid.UUID
    passenger_name: str = Field(min_length=1, max_length=160)
    passenger_email: EmailStr = Field(max_length=255)

    @field_validator("passenger_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Passenger name is required")
        return value


class BookingLookup(SQLModel):
    booking_reference: str = Field(min_length=1, max_length=32)
    passenger_email: EmailStr = Field(max_length=255)

    @field_validator("booking_reference")
    @classmethod
    def normalize_reference(cls, value: str) -> str:
        return value.strip().upper()


class BookingUpdate(SQLModel):
    status: BookingStatus


class BookingPublic(SQLModel):
    id: uuid.UUID
    booking_reference: str
    flight: FlightPublic
    passenger_name: str
    passenger_email: EmailStr
    status: BookingStatus
    booked_price_cents: int
    currency: str
    created_at: datetime
    updated_at: datetime


class BookingsPublic(SQLModel):
    data: list[BookingPublic]
    count: int


class AdminStats(SQLModel):
    scheduled_future_flights: int
    confirmed_bookings: int
    seats_sold: int
    seats_available: int
    load_factor: float


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None
