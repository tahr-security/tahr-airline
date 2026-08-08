from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Airport, Booking, Flight


def future_flight_body(
    airports: dict[str, Airport],
    *,
    number: str,
    capacity: int = 2,
    days: int = 120,
) -> dict[str, object]:
    departure = datetime.now(UTC) + timedelta(days=days)
    return {
        "flight_number": number,
        "origin_id": str(airports["YUL"].id),
        "destination_id": str(airports["YHZ"].id),
        "departure_at": departure.isoformat(),
        "arrival_at": (departure + timedelta(hours=2)).isoformat(),
        "price_cents": 15900,
        "total_capacity": capacity,
    }


def test_admin_endpoints_require_superuser(client: TestClient) -> None:
    assert client.get(f"{settings.API_V1_STR}/admin/stats").status_code == 401
    assert client.get(f"{settings.API_V1_STR}/admin/flights").status_code == 401
    assert client.get(f"{settings.API_V1_STR}/admin/bookings").status_code == 401


def test_admin_flight_lifecycle(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    airports = {item.code: item for item in db.exec(select(Airport)).all()}
    departure = datetime.now(UTC) + timedelta(days=90)
    body = {
        "flight_number": "ta900",
        "origin_id": str(airports["YUL"].id),
        "destination_id": str(airports["YHZ"].id),
        "departure_at": departure.isoformat(),
        "arrival_at": (departure + timedelta(hours=2)).isoformat(),
        "price_cents": 15900,
        "total_capacity": 36,
    }
    created = client.post(
        f"{settings.API_V1_STR}/admin/flights",
        headers=superuser_token_headers,
        json=body,
    )
    assert created.status_code == 201
    flight = created.json()
    assert flight["flight_number"] == "TA900"
    assert flight["available_capacity"] == 36

    updated = client.patch(
        f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
        headers=superuser_token_headers,
        json={"total_capacity": 40},
    )
    assert updated.status_code == 200
    assert updated.json()["available_capacity"] == 40

    cancelled = client.post(
        f"{settings.API_V1_STR}/admin/flights/{flight['id']}/cancel",
        headers=superuser_token_headers,
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    deleted = client.delete(
        f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
        headers=superuser_token_headers,
    )
    assert deleted.status_code == 200


def test_admin_stats_shape(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/admin/stats", headers=superuser_token_headers
    )
    assert response.status_code == 200
    assert set(response.json()) == {
        "scheduled_future_flights",
        "confirmed_bookings",
        "seats_sold",
        "seats_available",
        "load_factor",
    }


def test_admin_booking_transitions_and_capacity_rules(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    airports = {item.code: item for item in db.exec(select(Airport)).all()}
    created = client.post(
        f"{settings.API_V1_STR}/admin/flights",
        headers=superuser_token_headers,
        json=future_flight_body(airports, number="TA910"),
    )
    assert created.status_code == 201
    flight = created.json()

    booking_ids: list[str] = []
    for index in range(2):
        response = client.post(
            f"{settings.API_V1_STR}/bookings",
            json={
                "flight_id": flight["id"],
                "passenger_name": f"Admin Passenger {index}",
                "passenger_email": f"admin-passenger-{index}@example.com",
            },
        )
        assert response.status_code == 201
        booking_ids.append(response.json()["id"])

    assert (
        client.patch(
            f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
            headers=superuser_token_headers,
            json={"total_capacity": 1},
        ).status_code
        == 409
    )

    assert (
        client.delete(
            f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
            headers=superuser_token_headers,
        ).status_code
        == 409
    )

    listed_flights = client.get(
        f"{settings.API_V1_STR}/admin/flights?skip=0&limit=1",
        headers=superuser_token_headers,
    )
    assert listed_flights.status_code == 200
    assert listed_flights.json()["count"] >= 1
    detail = client.get(
        f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
        headers=superuser_token_headers,
    )
    assert detail.status_code == 200

    listed_bookings = client.get(
        f"{settings.API_V1_STR}/admin/bookings?status=confirmed",
        headers=superuser_token_headers,
    )
    assert listed_bookings.status_code == 200
    assert listed_bookings.json()["count"] >= 2

    cancelled = client.patch(
        f"{settings.API_V1_STR}/admin/bookings/{booking_ids[0]}",
        headers=superuser_token_headers,
        json={"status": "cancelled"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    reconfirmed = client.patch(
        f"{settings.API_V1_STR}/admin/bookings/{booking_ids[0]}",
        headers=superuser_token_headers,
        json={"status": "confirmed"},
    )
    assert reconfirmed.status_code == 200
    assert reconfirmed.json()["status"] == "confirmed"
    assert (
        client.patch(
            f"{settings.API_V1_STR}/admin/bookings/{booking_ids[0]}",
            headers=superuser_token_headers,
            json={"status": "confirmed"},
        ).status_code
        == 200
    )

    cancelled_flight = client.patch(
        f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
        headers=superuser_token_headers,
        json={"status": "cancelled"},
    )
    assert cancelled_flight.status_code == 200
    assert cancelled_flight.json()["available_capacity"] == 2
    assert (
        client.post(
            f"{settings.API_V1_STR}/admin/flights/{flight['id']}/cancel",
            headers=superuser_token_headers,
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"{settings.API_V1_STR}/admin/flights/{flight['id']}",
            headers=superuser_token_headers,
            json={"status": "scheduled"},
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"{settings.API_V1_STR}/admin/bookings/{booking_ids[0]}",
            headers=superuser_token_headers,
            json={"status": "confirmed"},
        ).status_code
        == 409
    )

    db.expire_all()
    for booking_id in booking_ids:
        booking = db.get(Booking, booking_id)
        assert booking is not None
        db.delete(booking)
    stored_flight = db.get(Flight, flight["id"])
    assert stored_flight is not None
    db.delete(stored_flight)
    db.commit()


def test_admin_validation_conflicts_and_missing_resources(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    airports = {item.code: item for item in db.exec(select(Airport)).all()}
    body = future_flight_body(airports, number="TA920", days=130)
    created = client.post(
        f"{settings.API_V1_STR}/admin/flights",
        headers=superuser_token_headers,
        json=body,
    )
    assert created.status_code == 201
    assert (
        client.post(
            f"{settings.API_V1_STR}/admin/flights",
            headers=superuser_token_headers,
            json=body,
        ).status_code
        == 409
    )

    same_airport = future_flight_body(airports, number="TA921", days=131)
    same_airport["destination_id"] = same_airport["origin_id"]
    assert (
        client.post(
            f"{settings.API_V1_STR}/admin/flights",
            headers=superuser_token_headers,
            json=same_airport,
        ).status_code
        == 422
    )

    missing_airport = future_flight_body(airports, number="TA922", days=132)
    missing_airport["origin_id"] = str(uuid4())
    assert (
        client.post(
            f"{settings.API_V1_STR}/admin/flights",
            headers=superuser_token_headers,
            json=missing_airport,
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"{settings.API_V1_STR}/admin/flights/{created.json()['id']}",
            headers=superuser_token_headers,
            json={"total_capacity": None},
        ).status_code
        == 422
    )
    invalid_number = future_flight_body(airports, number="  TA  ", days=133)
    assert (
        client.post(
            f"{settings.API_V1_STR}/admin/flights",
            headers=superuser_token_headers,
            json=invalid_number,
        ).status_code
        == 422
    )
    assert (
        client.delete(
            f"{settings.API_V1_STR}/admin/flights/{created.json()['id']}",
            headers=superuser_token_headers,
        ).status_code
        == 200
    )

    missing_id = uuid4()
    assert (
        client.get(
            f"{settings.API_V1_STR}/admin/flights/{missing_id}",
            headers=superuser_token_headers,
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"{settings.API_V1_STR}/admin/bookings/{missing_id}",
            headers=superuser_token_headers,
            json={"status": "cancelled"},
        ).status_code
        == 404
    )


def test_public_lists_health_and_validation(client: TestClient) -> None:
    airports = client.get(f"{settings.API_V1_STR}/airports?skip=0&limit=2")
    assert airports.status_code == 200
    assert airports.json()["count"] == 6
    assert len(airports.json()["data"]) == 2
    assert client.get(f"{settings.API_V1_STR}/utils/health-check/").json() is True
    assert (
        client.get(
            f"{settings.API_V1_STR}/flights/search",
            params={
                "origin": "YUL",
                "destination": "YUL",
                "departure_date": (datetime.now(UTC) + timedelta(days=1))
                .date()
                .isoformat(),
            },
        ).status_code
        == 422
    )
    assert client.get(f"{settings.API_V1_STR}/flights/{uuid4()}").status_code == 404
