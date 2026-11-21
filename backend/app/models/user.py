from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(Enum("admin", "student", name="user_role"), server_default="student")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("1"))
    must_change_password: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())