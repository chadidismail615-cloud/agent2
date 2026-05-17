from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    phone = Column(String(20))
    address = Column(Text)
    plan = Column(String(50), default="starter")  # starter, pro, enterprise
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="tenant")
    members = relationship("Member", back_populates="tenant")
    payments = relationship("Payment", back_populates="tenant")
