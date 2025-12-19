"""Pydantic schemas for Marketplace Listings"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from app.models.listing import ListingStatus
from app.schemas.user import UserBrief
from app.schemas.nft import NFTBrief


class ListingCreateRequest(BaseModel):
    """Request schema for creating a listing"""
    nft_id: int
    price_eth: str = Field(..., description="Price in ETH as string")
    amount: int = Field(default=1, ge=1, description="Amount for ERC-1155")


class ListingResponse(BaseModel):
    """Full listing response schema"""
    id: int
    listing_id: Optional[int] = None  # On-chain listing ID
    nft_id: int
    price_eth: str
    price_usd: Optional[Decimal] = None
    amount: int = 1
    status: ListingStatus
    list_tx_hash: Optional[str] = None
    sale_tx_hash: Optional[str] = None
    platform_fee_eth: Optional[str] = None
    royalty_fee_eth: Optional[str] = None
    seller_proceeds_eth: Optional[str] = None
    created_at: datetime
    sold_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

    # Related entities
    nft: Optional[NFTBrief] = None
    seller: Optional[UserBrief] = None
    buyer: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class ListingBrief(BaseModel):
    """Brief listing info"""
    id: int
    price_eth: str
    status: ListingStatus

    class Config:
        from_attributes = True


class ListingListResponse(BaseModel):
    """Paginated list of listings"""
    items: List[ListingResponse]
    total: int
    page: int
    page_size: int
    pages: int


class BuyRequest(BaseModel):
    """Request schema for buying an NFT"""
    listing_id: int


class BuyResponse(BaseModel):
    """Response schema for buy operation"""
    listing_id: int
    tx_hash: Optional[str] = None
    status: str
    message: str
