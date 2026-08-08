import uuid
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import col, func, select

from app.airline import flight_to_public
from app.api.deps import SessionDep
from app.models import Airport, Flight, FlightPublic, FlightsPublic, FlightStatus

router = APIRouter(prefix="/flights", tags=["flights"])


@router.get("/search", response_model=FlightsPublic)
def search_flights(
    session: SessionDep,
    origin: str = Query(min_length=3, max_length=3),
    destination: str = Query(min_length=3, max_length=3),
    departure_date: date = Query(),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> FlightsPublic:
    origin_code = origin.upper()
    destination_code = destination.upper()
    if origin_code == destination_code:
        raise HTTPException(status_code=422, detail="Airports must be different")
    origin_airport = session.exec(
        select(Airport).where(Airport.code == origin_code)
    ).first()
    destination_airport = session.exec(
        select(Airport).where(Airport.code == destination_code)
    ).first()
    if origin_airport is None or destination_airport is None:
        raise HTTPException(status_code=404, detail="Airport not found")
    try:
        origin_tz = ZoneInfo(origin_airport.timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=500, detail="Airport timezone is invalid")
    start = datetime.combine(departure_date, time.min, origin_tz).astimezone(UTC)
    end = (
        datetime.combine(departure_date, time.min, origin_tz) + timedelta(days=1)
    ).astimezone(UTC)
    filters = (
        Flight.origin_id == origin_airport.id,
        Flight.destination_id == destination_airport.id,
        Flight.departure_at >= start,
        Flight.departure_at < end,
        Flight.departure_at > datetime.now(UTC),
        Flight.status == FlightStatus.scheduled,
    )
    count = session.exec(select(func.count()).select_from(Flight).where(*filters)).one()
    flights = session.exec(
        select(Flight)
        .where(*filters)
        .order_by(col(Flight.departure_at))
        .offset(skip)
        .limit(limit)
    ).all()
    return FlightsPublic(
        data=[flight_to_public(session, flight) for flight in flights], count=count
    )


@router.get("/{flight_id}", response_model=FlightPublic)
def get_flight(flight_id: uuid.UUID, session: SessionDep) -> FlightPublic:
    flight = session.get(Flight, flight_id)
    if flight is None:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight_to_public(session, flight)
