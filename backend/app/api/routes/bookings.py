from fastapi import APIRouter

from app.airline import (
    booking_to_public,
    cancel_booking,
    create_confirmed_booking,
    get_booking_for_credentials,
)
from app.api.deps import SessionDep
from app.models import BookingCreate, BookingLookup, BookingPublic

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingPublic, status_code=201)
def create_booking(body: BookingCreate, session: SessionDep) -> BookingPublic:
    booking = create_confirmed_booking(
        session,
        flight_id=body.flight_id,
        passenger_name=body.passenger_name,
        passenger_email=str(body.passenger_email),
    )
    return booking_to_public(session, booking)


@router.post("/lookup", response_model=BookingPublic)
def lookup_booking(body: BookingLookup, session: SessionDep) -> BookingPublic:
    booking = get_booking_for_credentials(
        session,
        booking_reference=body.booking_reference,
        passenger_email=str(body.passenger_email),
    )
    return booking_to_public(session, booking)


@router.post("/cancel", response_model=BookingPublic)
def cancel_public_booking(body: BookingLookup, session: SessionDep) -> BookingPublic:
    booking = get_booking_for_credentials(
        session,
        booking_reference=body.booking_reference,
        passenger_email=str(body.passenger_email),
    )
    booking = cancel_booking(session, booking)
    return booking_to_public(session, booking)
