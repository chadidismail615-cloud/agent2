from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    full_name = Column(String(200), nullable=False)
    email = Column(String(200), index=True)
    phone = Column(String(20))
    address = Column(Text)
    date_of_birth = Column(Date)
    gender = Column(String(20))

    # Membership details
    plan = Column(String(100))  # basic, premium, vip
    plan_price = Column(Float, default=0.0)
    membership_start = Column(Date)
    membership_end = Column(Date)
    status = Column(String(50), default="active")  # active, expired, suspended, pending

    # Health info (optional)
    health_notes = Column(Text)
    emergency_contact = Column(String(200))
    emergency_phone = Column(String(20))

    # Trainer assignment
    assigned_trainer = Column(String(200))

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="members")
    payments = relationship("Payment", back_populates="member")
