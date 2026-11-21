from datetime import datetime

from sqlalchemy import JSON, Computed, DateTime, Enum, ForeignKey, Integer, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ProfileUpdateRequest(Base):
    __tablename__ = "profile_update_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    new_data: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(Enum("pending", "approved", "rejected", name="request_status"), server_default="pending")
    pending_flag: Mapped[int | None] = mapped_column(SmallInteger, Computed("IF(status = 'pending', 1, NULL)", persisted=True))
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    reject_reason: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)

    student: Mapped["Student"] = relationship()
    reviewer: Mapped["User | None"] = relationship()