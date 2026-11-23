from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    student_code: Mapped[str] = mapped_column(String(20), unique=True)
    full_name: Mapped[str] = mapped_column(String(100))
    birth_date: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(Enum("Nam", "Nữ", "Khác", name="student_gender"))
    email: Mapped[str] = mapped_column(String(100), unique=True)
    phone: Mapped[str] = mapped_column(String(15))
    address: Mapped[str | None] = mapped_column(String(255))
    avatar_filename: Mapped[str | None] = mapped_column(String(255))
    hobbies: Mapped[str | None] = mapped_column(Text)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped["User | None"] = relationship()
    classroom: Mapped["ClassRoom"] = relationship(back_populates="students")
    skills: Mapped[list["StudentSkill"]] = relationship(
        back_populates="student", cascade="all, delete-orphan", passive_deletes=True
    )
    social_links: Mapped[list["SocialLink"]] = relationship(
        back_populates="student", cascade="all, delete-orphan", passive_deletes=True
    )