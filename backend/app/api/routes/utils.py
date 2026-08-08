from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import SessionDep

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
def health_check(session: SessionDep) -> bool:
    session.exec(select(1))
    return True
