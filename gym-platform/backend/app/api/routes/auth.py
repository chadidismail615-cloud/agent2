from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.db.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    gym_name: str
    gym_email: EmailStr
    owner_name: str
    owner_email: EmailStr
    password: str
    phone: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    tenant_id: int
    gym_name: str
    role: str


def _make_slug(name: str) -> str:
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80]


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check uniqueness
    if db.query(Tenant).filter(Tenant.email == req.gym_email).first():
        raise HTTPException(400, "A gym with this email already exists")
    if db.query(User).filter(User.email == req.owner_email).first():
        raise HTTPException(400, "A user with this email already exists")

    slug = _make_slug(req.gym_name)
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    tenant = Tenant(
        name=req.gym_name,
        slug=slug,
        email=req.gym_email,
        phone=req.phone,
    )
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=req.owner_email,
        full_name=req.owner_name,
        hashed_password=hash_password(req.password),
        role="owner",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    token = create_access_token({"sub": str(user.id), "tenant_id": tenant.id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        user_name=user.full_name,
        tenant_id=tenant.id,
        gym_name=tenant.name,
        role=user.role,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant or not tenant.is_active:
        raise HTTPException(400, "Your gym account is inactive")

    token = create_access_token({"sub": str(user.id), "tenant_id": user.tenant_id})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        user_name=user.full_name,
        tenant_id=user.tenant_id,
        gym_name=tenant.name,
        role=user.role,
    )
