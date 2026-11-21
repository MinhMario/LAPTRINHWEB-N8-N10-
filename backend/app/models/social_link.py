from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class SocialLink(Base):
    __tablename__ = "social_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    platform: Mapped[str] = mapped_column(String(30))
    url: Mapped[str] = mapped_column(String(255))

    student: Mapped["Student"] = relationship(back_populates="social_links")