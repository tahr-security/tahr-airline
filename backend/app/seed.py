from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.models import Airport, Flight

AIRPORTS = (
    (
        "YUL",
        "Montréal",
        "Canada",
        "Montréal–Trudeau International Airport",
        "America/Toronto",
    ),
    (
        "YYZ",
        "Toronto",
        "Canada",
        "Toronto Pearson International Airport",
        "America/Toronto",
    ),
    ("YOW", "Ottawa", "Canada", "Ottawa International Airport", "America/Toronto"),
    (
        "YHZ",
        "Halifax",
        "Canada",
        "Halifax Stanfield International Airport",
        "America/Halifax",
    ),
    (
        "YVR",
        "Vancouver",
        "Canada",
        "Vancouver International Airport",
        "America/Vancouver",
    ),
    (
        "JFK",
        "New York",
        "United States",
        "John F. Kennedy International Airport",
        "America/New_York",
    ),
)


@dataclass(frozen=True)
class SeedFlight:
    flight_number: str
    origin: str
    destination: str
    day_offset: int
    departure_time: time
    duration: timedelta
    price_cents: int


SEED_FLIGHTS = (
    SeedFlight(
        "TA101", "YUL", "YYZ", 1, time(8, 0), timedelta(hours=1, minutes=15), 12900
    ),
    SeedFlight(
        "TA103", "YUL", "YYZ", 1, time(17, 30), timedelta(hours=1, minutes=15), 13900
    ),
    SeedFlight(
        "TA102", "YYZ", "YUL", 1, time(9, 45), timedelta(hours=1, minutes=15), 12900
    ),
    SeedFlight(
        "TA104", "YYZ", "YUL", 1, time(19, 15), timedelta(hours=1, minutes=15), 13900
    ),
    SeedFlight("TA201", "YUL", "YOW", 2, time(9, 0), timedelta(minutes=50), 9900),
    SeedFlight("TA202", "YOW", "YUL", 2, time(17, 0), timedelta(minutes=50), 9900),
    SeedFlight(
        "TA301", "YUL", "YHZ", 4, time(10, 0), timedelta(hours=1, minutes=40), 14900
    ),
    SeedFlight(
        "TA302", "YHZ", "YUL", 4, time(16, 0), timedelta(hours=1, minutes=40), 14900
    ),
    SeedFlight(
        "TA401", "YYZ", "YVR", 7, time(8, 0), timedelta(hours=5, minutes=10), 27900
    ),
    SeedFlight(
        "TA402", "YVR", "YYZ", 7, time(11, 0), timedelta(hours=4, minutes=30), 27900
    ),
    SeedFlight(
        "TA501", "YYZ", "JFK", 10, time(9, 0), timedelta(hours=1, minutes=45), 17900
    ),
    SeedFlight(
        "TA502", "JFK", "YYZ", 10, time(15, 0), timedelta(hours=1, minutes=40), 17900
    ),
)


def seed_airports(session: Session) -> dict[str, Airport]:
    for code, city, country, name, timezone in AIRPORTS:
        statement = insert(Airport).values(
            code=code, city=city, country=country, name=name, timezone=timezone
        )
        statement = statement.on_conflict_do_update(
            index_elements=[Airport.code],
            set_={"city": city, "country": country, "name": name, "timezone": timezone},
        )
        session.exec(statement)
    session.commit()
    return {airport.code: airport for airport in session.exec(select(Airport)).all()}


def seed_flights(session: Session, anchor_date: date | None = None) -> None:
    if session.exec(select(Flight.id).limit(1)).first() is not None:
        return
    airports = seed_airports(session)
    anchor = anchor_date or datetime.now(UTC).date()
    for item in SEED_FLIGHTS:
        origin = airports[item.origin]
        local_departure = datetime.combine(
            anchor + timedelta(days=item.day_offset),
            item.departure_time,
            ZoneInfo(origin.timezone),
        )
        departure_at = local_departure.astimezone(UTC)
        session.add(
            Flight(
                flight_number=item.flight_number,
                origin_id=origin.id,
                destination_id=airports[item.destination].id,
                departure_at=departure_at,
                arrival_at=departure_at + item.duration,
                price_cents=item.price_cents,
                total_capacity=36,
                available_capacity=36,
            )
        )
    session.commit()


def seed_catalog(session: Session, anchor_date: date | None = None) -> None:
    seed_airports(session)
    seed_flights(session, anchor_date=anchor_date)
