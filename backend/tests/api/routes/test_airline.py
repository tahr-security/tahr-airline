from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.airline import cancel_booking, create_confirmed_booking
from app.core.config import settings
from app.core.db import engine
from app.models import Airport, Booking, BookingStatus, Flight
from app.seed import seed_catalog


def test_seed_is_idempotent_and_fixed_anchor_is_deterministic(db: Session) -> None:
    before = list(db.exec(select(Flight)).all())
    seed_catalog(db, anchor_date=date(2030, 1, 1))
    after = list(db.exec(select(Flight)).all())
    assert len(after) == len(before) == 12
    assert len(db.exec(select(Airport)).all()) == 6


def test_search_booking_lookup_and_idempotent_cancel(
    client: TestClient, db: Session
) -> None:
    airports = {item.code: item for item in db.exec(select(Airport)).all()}
    departure = datetime.now(UTC) + timedelta(days=30)
    flight = Flight(
        flight_number=f"TA{uuid4().int % 9000 + 1000}",
        origin_id=airports["YUL"].id,
        destination_id=airports["YYZ"].id,
        departure_at=departure,
        arrival_at=departure + timedelta(hours=1, minutes=15),
        price_cents=12900,
        total_capacity=2,
        available_capacity=2,
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)

    search = client.get(
        f"{settings.API_V1_STR}/flights/search",
        params={
            "origin": "yul",
            "destination": "yyz",
            "departure_date": departure.astimezone(
                ZoneInfo(airports["YUL"].timezone)
            ).date().isoformat(),
        },
    )
    assert search.status_code == 200
    assert any(item["id"] == str(flight.id) for item in search.json()["data"])

    created = client.post(
        f"{settings.API_V1_STR}/bookings",
        json={
            "flight_id": str(flight.id),
            "passenger_name": "  Ada   Lovelace ",
            "passenger_email": "ADA@EXAMPLE.COM",
        },
    )
    assert created.status_code == 201
    booking = created.json()
    assert booking["booking_reference"].startswith("TAH-")
    assert len(booking["booking_reference"]) == 17
    assert booking["passenger_email"] == "ada@example.com"
    assert booking["flight"]["origin"]["code"] == "YUL"

    credentials = {
        "booking_reference": booking["booking_reference"].lower(),
        "passenger_email": "Ada@Example.com",
    }
    assert (
        client.post(
            f"{settings.API_V1_STR}/bookings/lookup", json=credentials
        ).status_code
        == 200
    )
    wrong_email_lookup = client.post(
        f"{settings.API_V1_STR}/bookings/lookup",
        json={
            "booking_reference": booking["booking_reference"],
            "passenger_email": "different-passenger@example.com",
        },
    )
    assert wrong_email_lookup.status_code == 404
    assert wrong_email_lookup.json() == {"detail": "Booking not found"}
    first_cancel = client.post(
        f"{settings.API_V1_STR}/bookings/cancel", json=credentials
    )
    second_cancel = client.post(
        f"{settings.API_V1_STR}/bookings/cancel", json=credentials
    )
    assert first_cancel.json()["status"] == BookingStatus.cancelled
    assert second_cancel.json()["status"] == BookingStatus.cancelled
    db.refresh(flight)
    assert flight.available_capacity == 2


def test_lookup_uses_generic_failure(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/bookings/lookup",
        json={
            "booking_reference": "TAH-0000000000000",
            "passenger_email": "nobody@example.com",
        },
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Booking not found"}


def test_one_remaining_seat_cannot_be_overbooked(db: Session) -> None:
    airports = {item.code: item for item in db.exec(select(Airport)).all()}
    departure = datetime.now(UTC) + timedelta(days=60)
    flight = Flight(
        flight_number=f"TC{uuid4().int % 9000 + 1000}",
        origin_id=airports["YUL"].id,
        destination_id=airports["YOW"].id,
        departure_at=departure,
        arrival_at=departure + timedelta(hours=1),
        price_cents=9900,
        total_capacity=1,
        available_capacity=1,
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)

    def attempt(index: int) -> bool:
        with Session(engine) as session:
            try:
                create_confirmed_booking(
                    session,
                    flight_id=flight.id,
                    passenger_name=f"Passenger {index}",
                    passenger_email=f"passenger{index}@example.com",
                )
                return True
            except HTTPException as exc:
                assert exc.status_code == 409
                return False

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(attempt, range(6)))
    assert results.count(True) == 1
    bookings = db.exec(
        select(Booking).where(
            Booking.flight_id == flight.id,
            Booking.status == BookingStatus.confirmed,
        )
    ).all()
    assert len(bookings) == 1
    db.expire_all()
    current_flight = db.get(Flight, flight.id)
    assert current_flight is not None
    assert current_flight.available_capacity == 0


def test_concurrent_cancellation_restores_one_seat(db: Session) -> None:
    airports = {item.code: item for item in db.exec(select(Airport)).all()}
    departure = datetime.now(UTC) + timedelta(days=70)
    flight = Flight(
        flight_number=f"TD{uuid4().int % 9000 + 1000}",
        origin_id=airports["YUL"].id,
        destination_id=airports["YHZ"].id,
        departure_at=departure,
        arrival_at=departure + timedelta(hours=2),
        price_cents=14900,
        total_capacity=1,
        available_capacity=1,
    )
    db.add(flight)
    db.commit()
    db.refresh(flight)
    booking = create_confirmed_booking(
        db,
        flight_id=flight.id,
        passenger_name="Grace Hopper",
        passenger_email="grace@example.com",
    )

    def attempt_cancel(_: int) -> BookingStatus:
        with Session(engine) as session:
            current_booking = session.get(Booking, booking.id)
            assert current_booking is not None
            return cancel_booking(session, current_booking).status

    with ThreadPoolExecutor(max_workers=6) as pool:
        statuses = list(pool.map(attempt_cancel, range(6)))
    assert statuses == [BookingStatus.cancelled] * 6
    db.expire_all()
    current_flight = db.get(Flight, flight.id)
    assert current_flight is not None
    assert current_flight.available_capacity == 1
