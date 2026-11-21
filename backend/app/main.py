"""Điểm vào của ứng dụng.  Chạy:  uvicorn app.main:app --reload"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.routers import audit, auth, classes, me, requests, skills, stats, students

app = FastAPI(title="Quản lý hồ sơ sinh viên", description="Xem API.md để biết hợp đồng chi tiết.")

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.SESSION_MAX_AGE,
    same_site="lax",
    https_only=False,
)

register_error_handlers(app)

for module in (auth, students, classes, skills, me, requests, audit, stats):
    app.include_router(module.router, prefix="/api")

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.FRONTEND_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/", StaticFiles(directory=settings.FRONTEND_DIR, html=True), name="frontend")