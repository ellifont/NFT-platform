"""Pydantic schemas for Authentication"""

from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class NonceRequest(BaseModel):
    """Request schema for getting a nonce"""
    wallet_address: str = Field(..., min_length=42, max_length=42)


class NonceResponse(BaseModel):
    """Response schema for nonce"""
    nonce: str
    message: str  # The full message to sign


class LoginRequest(BaseModel):
    """Request schema for login with signature"""
    wallet_address: str = Field(..., min_length=42, max_length=42)
    signature: str = Field(..., min_length=130, max_length=132)  # 65 bytes hex = 130-132 chars


class LoginResponse(BaseModel):
    """Response schema for successful login"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # wallet_address
    user_id: int
    exp: int  # expiration timestamp
