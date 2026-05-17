"""
GymOS AI Agent — powered by Claude claude-opus-4-7 with tool use and prompt caching.
Replaces WhatsApp, Excel, Google Calendar, PDFs, and manual data entry.
"""
import json
from datetime import datetime, date, timezone
from typing import AsyncGenerator, Any
import anthropic
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.member import Member
from app.models.billing import Payment

settings = get_settings()
client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

# ── System prompt (cached — stable content, never changes) ──────────────────
SYSTEM_PROMPT = """You are GymOS — an intelligent AI operations assistant for gym management.
You replace 4-6 disconnected tools (WhatsApp, Excel, Google Calendar, PDFs, Razorpay) with one unified brain.

## Your Capabilities
- **Member management**: Look up, add, update members; check membership status and expiry
- **Billing & payments**: Record payments, check dues, identify overdue members, revenue reports
- **Insights**: Gym health stats, retention analysis, revenue trends
- **Reminders**: Identify members whose memberships expire soon or are overdue

## How You Work
- Always use the available tools to query real data — never guess or fabricate numbers
- When asked about a member, look them up by name, email, or phone
- Be concise and actionable — gym staff are busy
- Proactively surface important information (e.g., "Also, 3 members expire this week")
- Format currency as ₹ (INR) unless the gym uses another currency
- For billing questions, always show totals and breakdowns

## Tone
- Friendly but efficient — like a smart colleague who knows the whole gym
- Short responses unless the user asks for a detailed report
- Use bullet points and tables for data-heavy responses

## What You Cannot Do
- You cannot send WhatsApp messages directly (yet — coming soon)
- You cannot process actual payment transactions — you only record them
- You cannot access external systems (Razorpay, Google Calendar) yet

When you don't know something, say so clearly and suggest what information would help."""


# ── Tool definitions ─────────────────────────────────────────────────────────
TOOLS = [
    {
        "name": "search_members",
        "description": "Search for gym members by name, email, phone, status, or plan. Returns a list of matching members with their membership details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search term (name, email, or phone)"},
                "status": {
                    "type": "string",
                    "enum": ["active", "expired", "suspended", "pending", "all"],
                    "description": "Filter by membership status",
                },
                "plan": {"type": "string", "description": "Filter by plan name (e.g., basic, premium, vip)"},
                "expiring_within_days": {
                    "type": "integer",
                    "description": "Return members whose membership expires within N days",
                },
                "limit": {"type": "integer", "description": "Max results to return (default 20)"},
            },
        },
    },
    {
        "name": "get_member_detail",
        "description": "Get complete details for a specific member including payment history.",
        "input_schema": {
            "type": "object",
            "properties": {
                "member_id": {"type": "integer", "description": "The member's ID"},
            },
            "required": ["member_id"],
        },
    },
    {
        "name": "create_member",
        "description": "Register a new gym member. Use this when staff wants to add a new member.",
        "input_schema": {
            "type": "object",
            "properties": {
                "full_name": {"type": "string", "description": "Member's full name"},
                "email": {"type": "string", "description": "Email address"},
                "phone": {"type": "string", "description": "Phone number"},
                "plan": {"type": "string", "description": "Membership plan (basic, premium, vip)"},
                "plan_price": {"type": "number", "description": "Monthly price in INR"},
                "membership_start": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                "membership_end": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                "assigned_trainer": {"type": "string", "description": "Trainer name (optional)"},
                "health_notes": {"type": "string", "description": "Health conditions or notes (optional)"},
            },
            "required": ["full_name"],
        },
    },
    {
        "name": "update_member",
        "description": "Update an existing member's information or renew their membership.",
        "input_schema": {
            "type": "object",
            "properties": {
                "member_id": {"type": "integer", "description": "The member's ID"},
                "full_name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "plan": {"type": "string"},
                "plan_price": {"type": "number"},
                "membership_start": {"type": "string", "description": "YYYY-MM-DD"},
                "membership_end": {"type": "string", "description": "YYYY-MM-DD"},
                "status": {"type": "string", "enum": ["active", "expired", "suspended", "pending"]},
                "assigned_trainer": {"type": "string"},
                "health_notes": {"type": "string"},
            },
            "required": ["member_id"],
        },
    },
    {
        "name": "record_payment",
        "description": "Record a payment made by a member. Use this to log cash, card, UPI, or bank transfers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "member_id": {"type": "integer", "description": "The member's ID"},
                "amount": {"type": "number", "description": "Amount paid in INR"},
                "payment_method": {
                    "type": "string",
                    "enum": ["cash", "card", "upi", "bank_transfer", "other"],
                    "description": "How payment was made",
                },
                "description": {"type": "string", "description": "What this payment is for"},
                "reference_id": {"type": "string", "description": "External reference (Razorpay ID, UPI ref, etc.)"},
                "notes": {"type": "string", "description": "Any additional notes"},
            },
            "required": ["member_id", "amount", "payment_method"],
        },
    },
    {
        "name": "get_billing_summary",
        "description": "Get billing summary — total revenue, pending payments, overdue members, and revenue by plan.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["today", "this_week", "this_month", "last_month", "all_time"],
                    "description": "Time period for the summary",
                },
            },
        },
    },
    {
        "name": "get_gym_stats",
        "description": "Get overall gym health statistics: total members, active/expired counts, revenue this month, new sign-ups, etc.",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "get_overdue_members",
        "description": "Get a list of members with overdue payments or expired memberships who haven't renewed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days_overdue": {
                    "type": "integer",
                    "description": "Members overdue by at least this many days (default 0 = all expired)",
                },
            },
        },
    },
]


# ── Tool execution ────────────────────────────────────────────────────────────
def execute_tool(tool_name: str, tool_input: dict, db: Session, tenant_id: int) -> str:
    try:
        if tool_name == "search_members":
            return _search_members(tool_input, db, tenant_id)
        elif tool_name == "get_member_detail":
            return _get_member_detail(tool_input, db, tenant_id)
        elif tool_name == "create_member":
            return _create_member(tool_input, db, tenant_id)
        elif tool_name == "update_member":
            return _update_member(tool_input, db, tenant_id)
        elif tool_name == "record_payment":
            return _record_payment(tool_input, db, tenant_id)
        elif tool_name == "get_billing_summary":
            return _get_billing_summary(tool_input, db, tenant_id)
        elif tool_name == "get_gym_stats":
            return _get_gym_stats(db, tenant_id)
        elif tool_name == "get_overdue_members":
            return _get_overdue_members(tool_input, db, tenant_id)
        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


def _member_to_dict(m: Member) -> dict:
    today = date.today()
    days_until_expiry = None
    if m.membership_end:
        days_until_expiry = (m.membership_end - today).days

    return {
        "id": m.id,
        "full_name": m.full_name,
        "email": m.email,
        "phone": m.phone,
        "plan": m.plan,
        "plan_price": m.plan_price,
        "status": m.status,
        "membership_start": str(m.membership_start) if m.membership_start else None,
        "membership_end": str(m.membership_end) if m.membership_end else None,
        "days_until_expiry": days_until_expiry,
        "assigned_trainer": m.assigned_trainer,
        "health_notes": m.health_notes,
        "joined": str(m.created_at.date()) if m.created_at else None,
    }


def _search_members(inp: dict, db: Session, tenant_id: int) -> str:
    q = db.query(Member).filter(Member.tenant_id == tenant_id, Member.is_active == True)

    if inp.get("query"):
        term = f"%{inp['query']}%"
        q = q.filter(
            (Member.full_name.ilike(term))
            | (Member.email.ilike(term))
            | (Member.phone.ilike(term))
        )

    if inp.get("status") and inp["status"] != "all":
        q = q.filter(Member.status == inp["status"])

    if inp.get("plan"):
        q = q.filter(Member.plan.ilike(f"%{inp['plan']}%"))

    if inp.get("expiring_within_days") is not None:
        today = date.today()
        from datetime import timedelta
        cutoff = today + timedelta(days=inp["expiring_within_days"])
        q = q.filter(Member.membership_end >= today, Member.membership_end <= cutoff)

    limit = inp.get("limit", 20)
    members = q.order_by(Member.full_name).limit(limit).all()

    if not members:
        return json.dumps({"found": 0, "members": [], "message": "No members found matching your criteria."})

    return json.dumps({"found": len(members), "members": [_member_to_dict(m) for m in members]})


def _get_member_detail(inp: dict, db: Session, tenant_id: int) -> str:
    member = db.query(Member).filter(
        Member.id == inp["member_id"], Member.tenant_id == tenant_id
    ).first()

    if not member:
        return json.dumps({"error": "Member not found"})

    data = _member_to_dict(member)
    payments = db.query(Payment).filter(
        Payment.member_id == member.id
    ).order_by(Payment.created_at.desc()).limit(10).all()

    data["recent_payments"] = [
        {
            "id": p.id,
            "amount": p.amount,
            "method": p.payment_method,
            "status": p.status,
            "description": p.description,
            "date": str(p.paid_at.date()) if p.paid_at else str(p.created_at.date()),
        }
        for p in payments
    ]
    data["total_paid"] = sum(p.amount for p in payments if p.status == "completed")

    return json.dumps(data)


def _create_member(inp: dict, db: Session, tenant_id: int) -> str:
    from datetime import date as date_type

    def parse_date(s):
        if not s:
            return None
        try:
            return date_type.fromisoformat(s)
        except ValueError:
            return None

    member = Member(
        tenant_id=tenant_id,
        full_name=inp["full_name"],
        email=inp.get("email"),
        phone=inp.get("phone"),
        plan=inp.get("plan"),
        plan_price=inp.get("plan_price", 0.0),
        membership_start=parse_date(inp.get("membership_start")),
        membership_end=parse_date(inp.get("membership_end")),
        assigned_trainer=inp.get("assigned_trainer"),
        health_notes=inp.get("health_notes"),
        status="active",
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return json.dumps({"success": True, "member": _member_to_dict(member), "message": f"Member {member.full_name} created successfully with ID #{member.id}"})


def _update_member(inp: dict, db: Session, tenant_id: int) -> str:
    from datetime import date as date_type

    member = db.query(Member).filter(
        Member.id == inp["member_id"], Member.tenant_id == tenant_id
    ).first()

    if not member:
        return json.dumps({"error": "Member not found"})

    fields = ["full_name", "email", "phone", "plan", "plan_price", "status", "assigned_trainer", "health_notes"]
    for f in fields:
        if f in inp:
            setattr(member, f, inp[f])

    for date_field in ["membership_start", "membership_end"]:
        if date_field in inp and inp[date_field]:
            try:
                setattr(member, date_field, date_type.fromisoformat(inp[date_field]))
            except ValueError:
                pass

    db.commit()
    db.refresh(member)
    return json.dumps({"success": True, "member": _member_to_dict(member), "message": f"Member {member.full_name} updated successfully"})


def _record_payment(inp: dict, db: Session, tenant_id: int) -> str:
    member = db.query(Member).filter(
        Member.id == inp["member_id"], Member.tenant_id == tenant_id
    ).first()

    if not member:
        return json.dumps({"error": "Member not found"})

    payment = Payment(
        tenant_id=tenant_id,
        member_id=member.id,
        amount=inp["amount"],
        payment_method=inp["payment_method"],
        description=inp.get("description", "Membership fee"),
        reference_id=inp.get("reference_id"),
        notes=inp.get("notes"),
        status="completed",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return json.dumps({
        "success": True,
        "payment_id": payment.id,
        "member": member.full_name,
        "amount": payment.amount,
        "method": payment.payment_method,
        "message": f"Payment of ₹{payment.amount:,.0f} recorded for {member.full_name} via {payment.payment_method}",
    })


def _get_billing_summary(inp: dict, db: Session, tenant_id: int) -> str:
    from datetime import timedelta

    period = inp.get("period", "this_month")
    today = date.today()
    now = datetime.now(timezone.utc)

    if period == "today":
        start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    elif period == "this_week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0)
    elif period == "this_month":
        start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    elif period == "last_month":
        if today.month == 1:
            start = datetime(today.year - 1, 12, 1, tzinfo=timezone.utc)
            end_date = datetime(today.year, 1, 1, tzinfo=timezone.utc)
        else:
            start = datetime(today.year, today.month - 1, 1, tzinfo=timezone.utc)
            end_date = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    else:
        start = datetime(2020, 1, 1, tzinfo=timezone.utc)

    q = db.query(Payment).filter(
        Payment.tenant_id == tenant_id,
        Payment.status == "completed",
        Payment.created_at >= start,
    )
    if period == "last_month":
        q = q.filter(Payment.created_at < end_date)

    payments = q.all()
    total_revenue = sum(p.amount for p in payments)
    payment_count = len(payments)

    by_method: dict[str, float] = {}
    for p in payments:
        by_method[p.payment_method or "other"] = by_method.get(p.payment_method or "other", 0) + p.amount

    overdue = db.query(Member).filter(
        Member.tenant_id == tenant_id,
        Member.status == "active",
        Member.membership_end < today,
        Member.is_active == True,
    ).count()

    return json.dumps({
        "period": period,
        "total_revenue": total_revenue,
        "payment_count": payment_count,
        "average_payment": total_revenue / payment_count if payment_count else 0,
        "by_payment_method": by_method,
        "overdue_members": overdue,
    })


def _get_gym_stats(db: Session, tenant_id: int) -> str:
    from datetime import timedelta

    today = date.today()
    this_month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

    total = db.query(Member).filter(Member.tenant_id == tenant_id, Member.is_active == True).count()
    active = db.query(Member).filter(Member.tenant_id == tenant_id, Member.status == "active", Member.is_active == True).count()
    expired = db.query(Member).filter(Member.tenant_id == tenant_id, Member.status == "expired", Member.is_active == True).count()
    new_this_month = db.query(Member).filter(
        Member.tenant_id == tenant_id,
        Member.created_at >= this_month_start,
        Member.is_active == True,
    ).count()
    expiring_soon = db.query(Member).filter(
        Member.tenant_id == tenant_id,
        Member.status == "active",
        Member.membership_end >= today,
        Member.membership_end <= today + timedelta(days=7),
        Member.is_active == True,
    ).count()

    revenue_this_month = db.query(Payment).filter(
        Payment.tenant_id == tenant_id,
        Payment.status == "completed",
        Payment.created_at >= this_month_start,
    ).all()
    monthly_revenue = sum(p.amount for p in revenue_this_month)

    return json.dumps({
        "total_members": total,
        "active_members": active,
        "expired_members": expired,
        "new_this_month": new_this_month,
        "expiring_within_7_days": expiring_soon,
        "revenue_this_month": monthly_revenue,
        "payment_count_this_month": len(revenue_this_month),
        "staff_hours_saved_estimate": round(total * 0.5),  # ~30 min/member saved on admin
    })


def _get_overdue_members(inp: dict, db: Session, tenant_id: int) -> str:
    from datetime import timedelta

    today = date.today()
    days_overdue = inp.get("days_overdue", 0)
    cutoff = today - timedelta(days=days_overdue)

    members = db.query(Member).filter(
        Member.tenant_id == tenant_id,
        Member.is_active == True,
        Member.membership_end < cutoff,
    ).order_by(Member.membership_end).all()

    result = []
    for m in members:
        days = (today - m.membership_end).days if m.membership_end else None
        result.append({
            **_member_to_dict(m),
            "days_overdue": days,
        })

    return json.dumps({
        "count": len(result),
        "members": result,
        "message": f"Found {len(result)} members with expired or overdue memberships",
    })


# ── Streaming chat ────────────────────────────────────────────────────────────
async def stream_chat(
    messages: list[dict],
    db: Session,
    tenant_id: int,
) -> AsyncGenerator[str, None]:
    """Run the agentic loop and stream text deltas as Server-Sent Events."""

    conversation = list(messages)

    while True:
        # Build request — system prompt is always first (cached)
        response_text = ""
        tool_uses = []
        stop_reason = None

        async with client.messages.stream(
            model=settings.claude_model,
            max_tokens=4096,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=TOOLS,  # type: ignore
            messages=conversation,
        ) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    if hasattr(event, "content_block") and event.content_block.type == "tool_use":
                        tool_uses.append({
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "input_raw": "",
                        })

                elif event.type == "content_block_delta":
                    if hasattr(event, "delta"):
                        if event.delta.type == "text_delta":
                            response_text += event.delta.text
                            yield f"data: {json.dumps({'type': 'text', 'content': event.delta.text})}\n\n"
                        elif event.delta.type == "input_json_delta" and tool_uses:
                            tool_uses[-1]["input_raw"] += event.delta.partial_json

                elif event.type == "message_delta":
                    if hasattr(event, "delta") and hasattr(event.delta, "stop_reason"):
                        stop_reason = event.delta.stop_reason

            final = await stream.get_final_message()

        # Append assistant turn to conversation
        conversation.append({"role": "assistant", "content": final.content})

        if stop_reason != "tool_use" or not tool_uses:
            break

        # Execute tools and feed results back
        tool_results = []
        for tool in tool_uses:
            yield f"data: {json.dumps({'type': 'tool_call', 'tool': tool['name']})}\n\n"
            try:
                tool_input = json.loads(tool["input_raw"]) if tool["input_raw"] else {}
            except json.JSONDecodeError:
                tool_input = {}

            result = execute_tool(tool["name"], tool_input, db, tenant_id)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool["id"],
                "content": result,
            })

        conversation.append({"role": "user", "content": tool_results})

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
