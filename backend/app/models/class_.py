from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class ClassRoom(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    major_id: Mapped[int] = mapped_column(ForeignKey("majors.id", ondelete="RESTRICT"))

    major: Mapped["Major"] = relationship(back_populates="classes")
    students: Mapped[list["Student"]] = relationship(back_populates="classroom")