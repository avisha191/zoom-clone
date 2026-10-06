from sqlalchemy import Column, Integer, String, DateTime, Text

from database import Base


class Meeting(Base):

    __tablename__ = "meetings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    meeting_id = Column(
        String(9),
        unique=True,
        index=True,
        nullable=False
    )

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    scheduled_time = Column(
        DateTime,
        nullable=True
    )

    duration = Column(
        Integer,
        nullable=True
    )

    meeting_type = Column(
        String(20),
        nullable=False,
        default="instant"
    )