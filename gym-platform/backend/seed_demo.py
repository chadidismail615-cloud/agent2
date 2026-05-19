"""
Seed the database with demo data for testing.
Run: python seed_demo.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, timedelta
from app.db.database import SessionLocal, init_db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.member import Member
from app.models.billing import Payment
from app.core.security import hash_password
from datetime import datetime, timezone

init_db()
db = SessionLocal()

print("🌱 Seeding demo data...")

# Tenant
tenant = db.query(Tenant).filter(Tenant.slug == "iron-paradise").first()
if not tenant:
    tenant = Tenant(
        name="Iron Paradise Fitness",
        slug="iron-paradise",
        email="contact@ironparadise.com",
        phone="9876543210",
        plan="pro",
    )
    db.add(tenant)
    db.flush()

# Owner user
user = db.query(User).filter(User.email == "owner@ironparadise.com").first()
if not user:
    user = User(
        tenant_id=tenant.id,
        email="owner@ironparadise.com",
        full_name="Raj Sharma",
        hashed_password=hash_password("demo1234"),
        role="owner",
    )
    db.add(user)

# Demo members
members_data = [
    dict(full_name="Priya Sharma", email="priya@example.com", phone="9876501234", plan="premium", plan_price=2500,
         membership_start=date.today() - timedelta(days=60), membership_end=date.today() + timedelta(days=30),
         status="active", assigned_trainer="Ravi Kumar"),
    dict(full_name="Arjun Mehta", email="arjun@example.com", phone="9876502345", plan="vip", plan_price=4000,
         membership_start=date.today() - timedelta(days=90), membership_end=date.today() + timedelta(days=4),
         status="active", assigned_trainer="Suman Joshi"),
    dict(full_name="Kavya Reddy", email="kavya@example.com", phone="9876503456", plan="basic", plan_price=1500,
         membership_start=date.today() - timedelta(days=30), membership_end=date.today() - timedelta(days=5),
         status="expired"),
    dict(full_name="Vikram Singh", email="vikram@example.com", phone="9876504567", plan="premium", plan_price=2500,
         membership_start=date.today() - timedelta(days=15), membership_end=date.today() + timedelta(days=45),
         status="active", assigned_trainer="Ravi Kumar"),
    dict(full_name="Meera Nair", email="meera@example.com", phone="9876505678", plan="basic", plan_price=1500,
         membership_start=date.today() - timedelta(days=45), membership_end=date.today() - timedelta(days=15),
         status="expired"),
    dict(full_name="Rohit Kumar", phone="9876506789", plan="vip", plan_price=4000,
         membership_start=date.today() - timedelta(days=10), membership_end=date.today() + timedelta(days=20),
         status="active"),
    dict(full_name="Anjali Patel", email="anjali@example.com", phone="9876507890", plan="premium", plan_price=2500,
         membership_start=date.today() - timedelta(days=5), membership_end=date.today() + timedelta(days=55),
         status="active", assigned_trainer="Suman Joshi"),
]

member_objs = []
for m in members_data:
    existing = db.query(Member).filter(
        Member.tenant_id == tenant.id, Member.full_name == m["full_name"]
    ).first()
    if not existing:
        obj = Member(tenant_id=tenant.id, **m)
        db.add(obj)
        db.flush()
        member_objs.append(obj)
    else:
        member_objs.append(existing)

# Demo payments
payments_data = [
    (0, 2500, "upi", "Monthly membership - Premium", date.today() - timedelta(days=30)),
    (0, 2500, "upi", "Monthly membership - Premium", date.today() - timedelta(days=60)),
    (1, 4000, "card", "Monthly membership - VIP", date.today() - timedelta(days=30)),
    (1, 4000, "cash", "Monthly membership - VIP", date.today() - timedelta(days=60)),
    (3, 2500, "upi", "Monthly membership - Premium", date.today() - timedelta(days=15)),
    (5, 4000, "cash", "Monthly membership - VIP", date.today() - timedelta(days=10)),
    (6, 2500, "card", "Monthly membership - Premium", date.today() - timedelta(days=5)),
]

for idx, amount, method, desc, paid_date in payments_data:
    if idx < len(member_objs):
        payment = Payment(
            tenant_id=tenant.id,
            member_id=member_objs[idx].id,
            amount=amount,
            payment_method=method,
            description=desc,
            status="completed",
            paid_at=datetime(paid_date.year, paid_date.month, paid_date.day, tzinfo=timezone.utc),
        )
        db.add(payment)

db.commit()
print(f"""
✅ Demo data seeded!

🏋️  Gym: Iron Paradise Fitness
📧  Login: owner@ironparadise.com
🔑  Password: demo1234
👥  Members: {len(member_objs)} seeded
""")
