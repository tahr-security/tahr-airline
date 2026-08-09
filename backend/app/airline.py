import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.models import (
    Airport,
    AirportPublic,
    Booking,
    BookingPublic,
    BookingStatus,
    EffectiveFlightStatus,
    Flight,
    FlightPublic,
    FlightStatus,
)

CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
REFERENCE_ATTEMPTS = 8


def utc_now() -> datetime:
    return datetime.now(UTC)


def ensure_aware(value: datetime, field_name: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must include a timezone offset",
        )
    return value


def normalize_email(value: str) -> str:
    return value.strip().lower()


def generate_booking_reference() -> str:
    return "TAH-" + "".join(secrets.choice(CROCKFORD_ALPHABET) for _ in range(13))


def get_airport(session: Session, airport_id: uuid.UUID) -> Airport:
    airport = session.get(Airport, airport_id)
    if airport is None:
        raise HTTPException(status_code=404, detail="Airport not found")
    return airport


def flight_to_public(session: Session, flight: Flight) -> FlightPublic:
    origin = get_airport(session, flight.origin_id)
    destination = get_airport(session, flight.destination_id)
    effective_status = EffectiveFlightStatus(flight.status)
    if (
        flight.status == FlightStatus.scheduled
        and flight.departure_at.astimezone(UTC) <= utc_now()
    ):
        effective_status = EffectiveFlightStatus.departed
    return FlightPublic(
        id=flight.id,
        flight_number=flight.flight_number,
        origin=AirportPublic.model_validate(origin),
        destination=AirportPublic.model_validate(destination),
        departure_at=flight.departure_at,
        arrival_at=flight.arrival_at,
        price_cents=flight.price_cents,
        currency=flight.currency,
        total_capacity=flight.total_capacity,
        available_capacity=flight.available_capacity,
        status=flight.status,
        effective_status=effective_status,
    )


def booking_to_public(session: Session, booking: Booking) -> BookingPublic:
    flight = session.get(Flight, booking.flight_id)
    if flight is None:  # protected by the database foreign key
        raise RuntimeError("Booking references a missing flight")
    return BookingPublic(
        id=booking.id,
        booking_reference=booking.booking_reference,
        flight=flight_to_public(session, flight),
        passenger_name=booking.passenger_name,
        passenger_email=booking.passenger_email,
        status=booking.status,
        booked_price_cents=booking.booked_price_cents,
        currency=booking.currency,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
    )


def get_booking_for_credentials(
    session: Session, *, booking_reference: str, passenger_email: str
) -> Booking:
    statement = select(Booking).where(
        Booking.booking_reference == booking_reference.strip().upper(),
        func.lower(Booking.passenger_email) == normalize_email(passenger_email),
    )
    booking = session.exec(statement).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def get_booking_by_reference(session: Session, *, booking_reference: str) -> Booking:
    statement = select(Booking).where(
        Booking.booking_reference == booking_reference.strip().upper()
    )
    booking = session.exec(statement).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def lock_flight(session: Session, flight_id: uuid.UUID) -> Flight:
    statement = select(Flight).where(Flight.id == flight_id).with_for_update()
    flight = session.exec(statement).first()
    if flight is None:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight


def lock_booking(session: Session, booking_id: uuid.UUID) -> Booking:
    statement = select(Booking).where(Booking.id == booking_id).with_for_update()
    booking = session.exec(statement).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def confirmed_booking_count(session: Session, flight_id: uuid.UUID) -> int:
    return session.exec(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.flight_id == flight_id,
            Booking.status == BookingStatus.confirmed,
        )
    ).one()


def create_confirmed_booking(
    session: Session,
    *,
    flight_id: uuid.UUID,
    passenger_name: str,
    passenger_email: str,
) -> Booking:
    flight = lock_flight(session, flight_id)
    if flight.status != FlightStatus.scheduled:
        raise HTTPException(status_code=409, detail="Flight is cancelled")
    if flight.departure_at.astimezone(UTC) <= utc_now():
        raise HTTPException(status_code=409, detail="Flight has departed")
    if flight.available_capacity < 1:
        raise HTTPException(status_code=409, detail="Flight is sold out")

    flight.available_capacity -= 1
    session.add(flight)
    normalized_email = normalize_email(passenger_email)
    for _ in range(REFERENCE_ATTEMPTS):
        booking = Booking(
            booking_reference=generate_booking_reference(),
            flight_id=flight.id,
            passenger_name=passenger_name,
            passenger_email=normalized_email,
            booked_price_cents=flight.price_cents,
        )
        try:
            with session.begin_nested():
                session.add(booking)
                session.flush()
            session.commit()
            session.refresh(booking)
            return booking
        except IntegrityError as exc:
            if "booking_reference" not in str(exc):
                session.rollback()
                raise
    session.rollback()
    raise HTTPException(status_code=503, detail="Could not allocate booking reference")


def cancel_booking(session: Session, booking: Booking) -> Booking:
    # Lock order is always flight, then booking.
    flight = lock_flight(session, booking.flight_id)
    locked_booking = lock_booking(session, booking.id)
    if locked_booking.status == BookingStatus.cancelled:
        session.commit()
        return locked_booking

    locked_booking.status = BookingStatus.cancelled
    locked_booking.updated_at = utc_now()
    flight.available_capacity = min(
        flight.total_capacity, flight.available_capacity + 1
    )
    session.add(locked_booking)
    session.add(flight)
    session.commit()
    session.refresh(locked_booking)
    return locked_booking


def reconfirm_booking(session: Session, booking: Booking) -> Booking:
    flight = lock_flight(session, booking.flight_id)
    locked_booking = lock_booking(session, booking.id)
    if locked_booking.status == BookingStatus.confirmed:
        session.commit()
        return locked_booking
    if flight.status != FlightStatus.scheduled:
        raise HTTPException(status_code=409, detail="Flight is cancelled")
    if flight.departure_at.astimezone(UTC) <= utc_now():
        raise HTTPException(status_code=409, detail="Flight has departed")
    if flight.available_capacity < 1:
        raise HTTPException(status_code=409, detail="Flight is sold out")
    locked_booking.status = BookingStatus.confirmed
    locked_booking.updated_at = utc_now()
    flight.available_capacity -= 1
    session.add(locked_booking)
    session.add(flight)
    session.commit()
    session.refresh(locked_booking)
    return locked_booking


def cancel_flight(session: Session, flight_id: uuid.UUID) -> Flight:
    flight = lock_flight(session, flight_id)
    if flight.status == FlightStatus.cancelled:
        session.commit()
        return flight
    bookings = session.exec(
        select(Booking)
        .where(
            Booking.flight_id == flight.id,
            Booking.status == BookingStatus.confirmed,
        )
        .order_by(col(Booking.id))
        .with_for_update()
    ).all()
    now = utc_now()
    for booking in bookings:
        booking.status = BookingStatus.cancelled
        booking.updated_at = now
        session.add(booking)
    flight.status = FlightStatus.cancelled
    flight.available_capacity = flight.total_capacity
    session.add(flight)
    session.commit()
    session.refresh(flight)
    return flight
