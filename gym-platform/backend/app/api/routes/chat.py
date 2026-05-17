from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.core.security import get_current_user, get_current_tenant_id
from app.services.ai_agent import stream_chat

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/stream")
async def chat_stream(
    req: ChatRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_current_tenant_id),
):
    if not req.messages:
        raise HTTPException(400, "messages cannot be empty")

    # Convert pydantic models to dicts for the agent
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    return StreamingResponse(
        stream_chat(messages, db, tenant_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
