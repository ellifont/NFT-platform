"""Pydantic schemas for User"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    """Base user schema"""
    wallet_address: str = Field(..., min_length=42, max_length=42)


class UserCreate(UserBase):
    """Schema for creating a user (automatic on first auth)"""
    pass


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    bio: Optional[str] = Field(None, max_length=500)
    profile_image_url: Optional[str] = Field(None, max_length=500)


class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_artist: bool = False
    is_admin: bool = False
    is_verified: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    """Brief user info for nested responses"""
    id: int
    wallet_address: str
    username: Optional[str] = None
    is_verified: bool = False

    class Config:
        from_attributes = True
