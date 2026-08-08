from fastapi import APIRouter, Query
from sqlmodel import col, func, select

from app.api.deps import SessionDep
from app.models import Airport, AirportPublic, AirportsPublic

router = APIRouter(prefix="/airports", tags=["airports"])


@router.get("", response_model=AirportsPublic)
def list_airports(
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
) -> AirportsPublic:
    count = session.exec(select(func.count()).select_from(Airport)).one()
    airports = session.exec(
        select(Airport).order_by(col(Airport.code)).offset(skip).limit(limit)
    ).all()
    return AirportsPublic(
        data=[AirportPublic.model_validate(airport) for airport in airports],
        count=count,
    )
