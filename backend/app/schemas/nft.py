"""Pydantic schemas for NFT"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from app.models.nft import TokenStandard
from app.schemas.user import UserBrief


class NFTAttribute(BaseModel):
    """NFT attribute following OpenSea standard"""
    trait_type: str
    value: str | int | float
    display_type: Optional[str] = None  # "number", "boost_percentage", etc.


class NFTMintRequest(BaseModel):
    """Request schema for minting an NFT"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    image_url: str = Field(..., max_length=500)  # Pre-uploaded image URL
    attributes: Optional[List[NFTAttribute]] = None
    royalty_percentage: Optional[Decimal] = Field(default=5.0, ge=0, le=10)
    token_standard: TokenStandard = TokenStandard.ERC721
    edition_size: Optional[int] = Field(default=1, ge=1)  # For ERC-1155


class NFTMintResponse(BaseModel):
    """Response schema for mint operation"""
    nft_id: int
    token_id: int
    contract_address: str
    metadata_uri: str
    tx_hash: Optional[str] = None


class NFTBase(BaseModel):
    """Base NFT schema"""
    token_id: int
    contract_address: str
    token_standard: TokenStandard
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    metadata_uri: str


class NFTResponse(NFTBase):
    """Full NFT response schema"""
    id: int
    amount: int = 1
    royalty_percentage: Decimal = Decimal("5.0")
    is_listed: bool = False
    is_burned: bool = False
    mint_tx_hash: Optional[str] = None
    created_at: datetime
    owner: Optional[UserBrief] = None
    creator: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class NFTBrief(BaseModel):
    """Brief NFT info for nested responses"""
    id: int
    token_id: int
    contract_address: str
    name: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class NFTListResponse(BaseModel):
    """Paginated list of NFTs"""
    items: List[NFTResponse]
    total: int
    page: int
    page_size: int
    pages: int
