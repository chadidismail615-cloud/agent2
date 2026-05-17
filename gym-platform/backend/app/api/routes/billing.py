from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, date, timezone
from typing import Optional

from app.db.database import get_db
from app.core.security import get_current_tenant_id
from app.models.billing import Payment
from app.models.member import Member

router = APIRouter(prefix="/billing", tags=["billing"])


class PaymentCreate(BaseModel):
    member_id: int
    amount: float
    payment_method: str = "cash"
    description: Optional[str] = "Membership fee"
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None


def _serialize_payment(p: Payment, member_name: str = "") -> dict:
    return {
        "id": p.id,
        "member_id": p.member_id,
        "member_name": member_name,
        "amount": p.amount,
        "currency": p.currency,
        "payment_method": p.payment_method,
        "status": p.status,
        "description": p.description,
        "reference_id": p.reference_id,
        "notes": p.notes,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/payments")
def list_payments(
    member_id: Optional[int] = None,
    status: Optional[str] = None,
    method: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    q = db.query(Payment, Member.full_name).join(
        Member, Payment.member_id == Member.id
    ).filter(Payment.tenant_id == tenant_id)

    if member_id:
        q = q.filter(Payment.member_id == member_id)
    if status:
        q = q.filter(Payment.status == status)
    if method:
        q = q.filter(Payment.payment_method == method)

    total = q.count()
    rows = q.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "payments": [_serialize_payment(p, name) for p, name in rows],
    }


@router.post("/payments", status_code=201)
def create_payment(
    req: PaymentCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    member = db.query(Member).filter(
        Member.id == req.member_id, Member.tenant_id == tenant_id
    ).first()
    if not member:
        raise HTTPException(404, "Member not found")

    payment = Payment(
        tenant_id=tenant_id,
        member_id=req.member_id,
        amount=req.amount,
        payment_method=req.payment_method,
        description=req.description,
        reference_id=req.reference_id,
        notes=req.notes,
        due_date=req.due_date,
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return _serialize_payment(payment, member.full_name)


@router.get("/summary")
def billing_summary(
    period: str = Query("this_month", regex="^(today|this_week|this_month|last_month|all_time)$"),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    from datetime import timedelta

    today = date.today()
    now = datetime.now(timezone.utc)

    if period == "today":
        start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
        end = now
    elif period == "this_week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0)
        end = now
    elif period == "this_month":
        start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
        end = now
    elif period == "last_month":
        if today.month == 1:
            start = datetime(today.year - 1, 12, 1, tzinfo=timezone.utc)
            end = datetime(today.year, 1, 1, tzinfo=timezone.utc)
        else:
            start = datetime(today.year, today.month - 1, 1, tzinfo=timezone.utc)
            end = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    else:
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)
        end = now

    payments = db.query(Payment).filter(
        Payment.tenant_id == tenant_id,
        Payment.status == "completed",
        Payment.created_at >= start,
        Payment.created_at <= end,
    ).all()

    total = sum(p.amount for p in payments)
    by_method: dict[str, float] = {}
    for p in payments:
        key = p.payment_method or "other"
        by_method[key] = by_method.get(key, 0) + p.amount

    overdue_count = db.query(Member).filter(
        Member.tenant_id == tenant_id,
        Member.is_active == True,
        Member.membership_end < today,
        Member.status == "active",
    ).count()

    return {
        "period": period,
        "total_revenue": total,
        "transaction_count": len(payments),
        "average_transaction": total / len(payments) if payments else 0,
        "by_payment_method": by_method,
        "overdue_members": overdue_count,
    }


@router.get("/overdue")
def overdue_members(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    today = date.today()
    members = db.query(Member).filter(
        Member.tenant_id == tenant_id,
        Member.is_active == True,
        Member.membership_end < today,
    ).order_by(Member.membership_end).all()

    result = []
    for m in members:
        days = (today - m.membership_end).days if m.membership_end else None
        result.append({
            "id": m.id,
            "full_name": m.full_name,
            "email": m.email,
            "phone": m.phone,
            "plan": m.plan,
            "membership_end": str(m.membership_end),
            "days_overdue": days,
        })

    return {"count": len(result), "members": result}
