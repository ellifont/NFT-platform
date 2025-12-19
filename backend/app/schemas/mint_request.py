"""Pydantic schemas for Mint Requests"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from app.models.mint_request import MintRequestStatus, TokenStandardRequest
from app.schemas.user import UserBrief
from app.schemas.nft import NFTBrief, NFTAttribute


class MintRequestCreate(BaseModel):
    """Request schema for submitting a mint request"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    artwork_url: str = Field(..., max_length=500)  # URL to the artwork
    token_standard: TokenStandardRequest = TokenStandardRequest.ERC721
    edition_size: int = Field(default=1, ge=1)
    royalty_percentage: Decimal = Field(default=Decimal("5.0"), ge=0, le=10)
    attributes: Optional[List[NFTAttribute]] = None


class MintRequestUpdate(BaseModel):
    """Request schema for updating a mint request (before approval)"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    artwork_url: Optional[str] = Field(None, max_length=500)
    edition_size: Optional[int] = Field(None, ge=1)
    royalty_percentage: Optional[Decimal] = Field(None, ge=0, le=10)


class MintRequestReview(BaseModel):
    """Request schema for admin review"""
    status: MintRequestStatus
    admin_notes: Optional[str] = Field(None, max_length=1000)


class MintRequestResponse(BaseModel):
    """Full mint request response schema"""
    id: int
    title: str
    description: Optional[str] = None
    artwork_url: str
    token_standard: TokenStandardRequest
    edition_size: int = 1
    royalty_percentage: Decimal
    image_ipfs_uri: Optional[str] = None
    metadata_ipfs_uri: Optional[str] = None
    status: MintRequestStatus
    admin_notes: Optional[str] = None
    mint_tx_hash: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    minted_at: Optional[datetime] = None

    # Related entities
    artist: Optional[UserBrief] = None
    reviewer: Optional[UserBrief] = None
    nft: Optional[NFTBrief] = None

    class Config:
        from_attributes = True


class MintRequestBrief(BaseModel):
    """Brief mint request info"""
    id: int
    title: str
    status: MintRequestStatus
    created_at: datetime

    class Config:
        from_attributes = True


class MintRequestListResponse(BaseModel):
    """Paginated list of mint requests"""
    items: List[MintRequestResponse]
    total: int
    page: int
    page_size: int
    pages: int
