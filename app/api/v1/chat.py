"""Interactive chat endpoint for querying analysis results"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message model"""
    role: str = Field(..., description="Message role (user or assistant)")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request model"""
    analysis_id: str = Field(..., description="Analysis ID to query")
    message: str = Field(..., description="User question")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Conversation history")


class ChatResponse(BaseModel):
    """Chat response model"""
    message: str = Field(..., description="Assistant response")
    sources: Optional[List[str]] = Field(None, description="Source references")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Interactive chat endpoint for querying analysis results

    Allows users to ask questions about security findings, get explanations,
    and explore analysis results conversationally
    """
    try:
        response = await ChatService.process_message(
            analysis_id=request.analysis_id,
            message=request.message,
            history=request.history
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing chat message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chat/{analysis_id}/history")
async def get_chat_history(analysis_id: str):
    """
    Get chat history for an analysis
    """
    try:
        history = await ChatService.get_chat_history(analysis_id)
        return {
            "analysis_id": analysis_id,
            "messages": history
        }
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
