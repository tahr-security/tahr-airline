import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, func, select

from app.airline import (
    booking_to_public,
    cancel_booking,
    cancel_flight,
    confirmed_booking_count,
    ensure_aware,
    flight_to_public,
    lock_flight,
    reconfirm_booking,
)
from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    AdminStats,
    Booking,
    BookingPublic,
    BookingsPublic,
    BookingStatus,
    BookingUpdate,
    Flight,
    FlightCreate,
    FlightPublic,
    FlightsPublic,
    FlightStatus,
    FlightUpdate,
    Message,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_active_superuser)],
)


def validate_flight_values(
    session: Session,
    *,
    origin_id: uuid.UUID,
    destination_id: uuid.UUID,
    departure_at: datetime,
    arrival_at: datetime,
) -> None:
    ensure_aware(departure_at, "departure_at")
    ensure_aware(arrival_at, "arrival_at")
    if origin_id == destination_id:
        raise HTTPException(status_code=422, detail="Airports must be different")
    if arrival_at <= departure_at:
        raise HTTPException(status_code=422, detail="Arrival must follow departure")
    from app.models import Airport

    if (
        session.get(Airport, origin_id) is None
        or session.get(Airport, destination_id) is None
    ):
        raise HTTPException(status_code=404, detail="Airport not found")


def commit_flight(session: Session, flight: Flight) -> Flight:
    try:
        session.add(flight)
        session.commit()
        session.refresh(flight)
        return flight
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="A flight with that number and departure time already exists",
        )


@router.get("/stats", response_model=AdminStats)
def get_stats(session: SessionDep) -> AdminStats:
    future_filter = (
        Flight.status == FlightStatus.scheduled,
        Flight.departure_at > datetime.now(UTC),
    )
    aggregate = session.exec(
        select(
            func.count(col(Flight.id)),
            func.coalesce(
                func.sum(Flight.total_capacity - Flight.available_capacity), 0
            ),
            func.coalesce(func.sum(Flight.available_capacity), 0),
        ).where(*future_filter)
    ).one()
    confirmed = session.exec(
        select(func.count())
        .select_from(Booking)
        .join(Flight, col(Booking.flight_id) == col(Flight.id))
        .where(Booking.status == BookingStatus.confirmed, *future_filter)
    ).one()
    flight_count, seats_sold, seats_available = (int(value) for value in aggregate)
    total = seats_sold + seats_available
    return AdminStats(
        scheduled_future_flights=flight_count,
        confirmed_bookings=confirmed,
        seats_sold=seats_sold,
        seats_available=seats_available,
        load_factor=round(seats_sold / total * 100, 1) if total else 0.0,
    )


@router.get("/flights", response_model=FlightsPublic)
def list_flights(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> FlightsPublic:
    count = session.exec(select(func.count()).select_from(Flight)).one()
    flights = session.exec(
        select(Flight)
        .order_by(col(Flight.departure_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return FlightsPublic(
        data=[flight_to_public(session, flight) for flight in flights], count=count
    )


@router.get("/flights/{flight_id}", response_model=FlightPublic)
def get_admin_flight(flight_id: uuid.UUID, session: SessionDep) -> FlightPublic:
    flight = session.get(Flight, flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight_to_public(session, flight)


@router.post("/flights", response_model=FlightPublic, status_code=201)
def create_flight(body: FlightCreate, session: SessionDep) -> FlightPublic:
    validate_flight_values(
        session,
        origin_id=body.origin_id,
        destination_id=body.destination_id,
        departure_at=body.departure_at,
        arrival_at=body.arrival_at,
    )
    flight = Flight(
        **body.model_dump(),
        available_capacity=body.total_capacity,
    )
    flight = commit_flight(session, flight)
    return flight_to_public(session, flight)


@router.patch("/flights/{flight_id}", response_model=FlightPublic)
def update_flight(
    flight_id: uuid.UUID, body: FlightUpdate, session: SessionDep
) -> FlightPublic:
    flight = lock_flight(session, flight_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("status") == FlightStatus.cancelled:
        flight = cancel_flight(session, flight_id)
        return flight_to_public(session, flight)
    if (
        flight.status == FlightStatus.cancelled
        and changes.get("status") == FlightStatus.scheduled
    ):
        raise HTTPException(
            status_code=409, detail="Cancelled flights cannot be reopened"
        )

    origin_id = changes.get("origin_id", flight.origin_id)
    destination_id = changes.get("destination_id", flight.destination_id)
    departure_at = changes.get("departure_at", flight.departure_at)
    arrival_at = changes.get("arrival_at", flight.arrival_at)
    validate_flight_values(
        session,
        origin_id=origin_id,
        destination_id=destination_id,
        departure_at=departure_at,
        arrival_at=arrival_at,
    )
    if "total_capacity" in changes:
        confirmed_count = confirmed_booking_count(session, flight.id)
        new_total = changes["total_capacity"]
        if new_total < confirmed_count:
            raise HTTPException(
                status_code=409,
                detail="Capacity cannot be lower than confirmed bookings",
            )
        changes["available_capacity"] = new_total - confirmed_count
    changes.pop("status", None)
    flight.sqlmodel_update(changes)
    flight = commit_flight(session, flight)
    return flight_to_public(session, flight)


@router.post("/flights/{flight_id}/cancel", response_model=FlightPublic)
def cancel_admin_flight(flight_id: uuid.UUID, session: SessionDep) -> FlightPublic:
    flight = cancel_flight(session, flight_id)
    return flight_to_public(session, flight)


@router.delete("/flights/{flight_id}", response_model=Message)
def delete_flight(flight_id: uuid.UUID, session: SessionDep) -> Message:
    flight = lock_flight(session, flight_id)
    booking_count = session.exec(
        select(func.count()).select_from(Booking).where(Booking.flight_id == flight.id)
    ).one()
    if booking_count:
        raise HTTPException(status_code=409, detail="Flight has bookings")
    session.delete(flight)
    session.commit()
    return Message(message="Flight deleted")


@router.get("/bookings", response_model=BookingsPublic)
def list_bookings(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
) -> BookingsPublic:
    filters = () if status_filter is None else (Booking.status == status_filter,)
    count = session.exec(
        select(func.count()).select_from(Booking).where(*filters)
    ).one()
    bookings = session.exec(
        select(Booking)
        .where(*filters)
        .order_by(col(Booking.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return BookingsPublic(
        data=[booking_to_public(session, booking) for booking in bookings], count=count
    )


@router.patch("/bookings/{booking_id}", response_model=BookingPublic)
def update_booking_status(
    booking_id: uuid.UUID, body: BookingUpdate, session: SessionDep
) -> BookingPublic:
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if body.status == BookingStatus.cancelled:
        booking = cancel_booking(session, booking)
    else:
        booking = reconfirm_booking(session, booking)
    return booking_to_public(session, booking)
