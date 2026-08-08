from fastapi import APIRouter

from app.api.routes import (
    admin,
    airports,
    bookings,
    flights,
    login,
    users,
    utils,
)

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(airports.router)
api_router.include_router(flights.router)
api_router.include_router(bookings.router)
api_router.include_router(admin.router)
