"""Listing model for NFT marketplace listings"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class ListingStatus(str, enum.Enum):
    """Listing status"""
    ACTIVE = "active"
    SOLD = "sold"
    CANCELLED = "cancelled"


class Listing(Base):
    """Listing model - tracks NFTs listed for sale"""

    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)

    # Blockchain listing ID (from Marketplace contract)
    listing_id = Column(Integer, nullable=True, unique=True, index=True)

    # NFT reference
    nft_id = Column(Integer, ForeignKey("nfts.id"), nullable=False)

    # Seller
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Price in ETH (stored as string to preserve precision)
    price_eth = Column(String(78), nullable=False)  # Wei as string
    price_usd = Column(Numeric(18, 2), nullable=True)  # Optional USD equivalent

    # For ERC-1155: amount listed
    amount = Column(Integer, default=1)

    # Status
    status = Column(Enum(ListingStatus), default=ListingStatus.ACTIVE, index=True)

    # Buyer info (populated on sale)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Transaction hashes
    list_tx_hash = Column(String(66), nullable=True)
    sale_tx_hash = Column(String(66), nullable=True)
    cancel_tx_hash = Column(String(66), nullable=True)

    # Fee breakdown (populated on sale)
    platform_fee_eth = Column(String(78), nullable=True)
    royalty_fee_eth = Column(String(78), nullable=True)
    seller_proceeds_eth = Column(String(78), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sold_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Relationships
    nft = relationship("NFT", back_populates="listings")
    seller = relationship("User", back_populates="listings", foreign_keys=[seller_id])
    buyer = relationship("User", foreign_keys=[buyer_id])

    def __repr__(self):
        return f"<Listing(id={self.id}, nft_id={self.nft_id}, status={self.status})>"
