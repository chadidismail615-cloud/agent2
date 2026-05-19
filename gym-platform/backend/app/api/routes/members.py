from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional

from app.db.database import get_db
from app.core.security import get_current_user, get_current_tenant_id
from app.models.member import Member

router = APIRouter(prefix="/members", tags=["members"])


class MemberCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    plan: Optional[str] = None
    plan_price: float = 0.0
    membership_start: Optional[date] = None
    membership_end: Optional[date] = None
    assigned_trainer: Optional[str] = None
    health_notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


class MemberUpdate(MemberCreate):
    full_name: Optional[str] = None
    status: Optional[str] = None


def _serialize(m: Member) -> dict:
    today = date.today()
    days_until_expiry = None
    if m.membership_end:
        days_until_expiry = (m.membership_end - today).days

    return {
        "id": m.id,
        "full_name": m.full_name,
        "email": m.email,
        "phone": m.phone,
        "address": m.address,
        "date_of_birth": str(m.date_of_birth) if m.date_of_birth else None,
        "gender": m.gender,
        "plan": m.plan,
        "plan_price": m.plan_price,
        "membership_start": str(m.membership_start) if m.membership_start else None,
        "membership_end": str(m.membership_end) if m.membership_end else None,
        "status": m.status,
        "days_until_expiry": days_until_expiry,
        "assigned_trainer": m.assigned_trainer,
        "health_notes": m.health_notes,
        "emergency_contact": m.emergency_contact,
        "emergency_phone": m.emergency_phone,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    }


@router.get("")
def list_members(
    status: Optional[str] = None,
    search: Optional[str] = None,
    plan: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    q = db.query(Member).filter(Member.tenant_id == tenant_id, Member.is_active == True)

    if status:
        q = q.filter(Member.status == status)
    if plan:
        q = q.filter(Member.plan.ilike(f"%{plan}%"))
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Member.full_name.ilike(term)) | (Member.email.ilike(term)) | (Member.phone.ilike(term))
        )

    total = q.count()
    members = q.order_by(Member.full_name).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "members": [_serialize(m) for m in members]}


@router.post("", status_code=201)
def create_member(
    req: MemberCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    member = Member(tenant_id=tenant_id, **req.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return _serialize(member)


@router.get("/{member_id}")
def get_member(
    member_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    m = db.query(Member).filter(Member.id == member_id, Member.tenant_id == tenant_id).first()
    if not m:
        raise HTTPException(404, "Member not found")
    return _serialize(m)


@router.put("/{member_id}")
def update_member(
    member_id: int,
    req: MemberUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    m = db.query(Member).filter(Member.id == member_id, Member.tenant_id == tenant_id).first()
    if not m:
        raise HTTPException(404, "Member not found")

    for k, v in req.model_dump(exclude_none=True).items():
        setattr(m, k, v)

    db.commit()
    db.refresh(m)
    return _serialize(m)


@router.delete("/{member_id}", status_code=204)
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    m = db.query(Member).filter(Member.id == member_id, Member.tenant_id == tenant_id).first()
    if not m:
        raise HTTPException(404, "Member not found")
    m.is_active = False
    db.commit()
