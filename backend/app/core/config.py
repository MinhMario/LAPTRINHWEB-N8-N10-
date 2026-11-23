"""Cấu hình ứng dụng: đọc từ file .env (xem .env.example)."""
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env")


def _path(value: str) -> Path:
    p = Path(value)
    return p if p.is_absolute() else BASE_DIR / p


class Settings:
    # DB_ENGINE=sqlite -> chạy bằng 1 file student.db, KHÔNG cần cài MySQL (dùng để demo/nộp bài nhanh).
    # DB_ENGINE=mysql  -> dùng MySQL như schema.sql (mặc định khi không khai báo).
    DB_ENGINE = os.getenv("DB_ENGINE", "mysql").strip().lower()
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "student_db")

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-change-me")
    SESSION_MAX_AGE = 60 * 60 * 8

    DEFAULT_STUDENT_PASSWORD = os.getenv("DEFAULT_STUDENT_PASSWORD", "Ptit@2026")

    UPLOAD_DIR = _path(os.getenv("UPLOAD_DIR", "uploads"))
    MAX_AVATAR_BYTES = int(float(os.getenv("MAX_AVATAR_MB", "2")) * 1024 * 1024)
    FRONTEND_DIR = PROJECT_ROOT / "frontend"

    DEFAULT_AVATAR_URL = "/uploads/default-avatar.png"
    PAGE_SIZE_MAX = 50

    @property
    def IS_SQLITE(self) -> bool:
        return self.DB_ENGINE == "sqlite"

    @property
    def SQLITE_PATH(self) -> Path:
        p = Path(os.getenv("SQLITE_PATH", "student.db"))
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def DATABASE_URL(self) -> str | URL:
        if self.IS_SQLITE:
            return f"sqlite:///{self.SQLITE_PATH.as_posix()}"
        return URL.create(
            "mysql+pymysql",
            username=self.DB_USER,
            password=self.DB_PASSWORD or None,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
            query={"charset": "utf8mb4"},
        )


settings = Settings()
