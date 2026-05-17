from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)

    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    description = Column(String(500))
    payment_method = Column(String(50))  # cash, card, upi, bank_transfer
    status = Column(String(50), default="completed")  # pending, completed, failed, refunded
    reference_id = Column(String(200))  # external payment gateway reference
    notes = Column(Text)

    due_date = Column(DateTime)
    paid_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="payments")
    member = relationship("Member", back_populates="payments")
