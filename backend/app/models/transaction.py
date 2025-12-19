"""Transaction model for tracking blockchain transactions"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class TransactionType(str, enum.Enum):
    """Type of blockchain transaction"""
    MINT = "mint"
    TRANSFER = "transfer"
    LIST = "list"
    BUY = "buy"
    CANCEL_LISTING = "cancel_listing"
    BURN = "burn"
    APPROVE = "approve"


class TransactionStatus(str, enum.Enum):
    """Transaction status"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class Transaction(Base):
    """Transaction model - tracks blockchain transactions"""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    # Transaction hash
    tx_hash = Column(String(66), unique=True, index=True, nullable=False)

    # Transaction type
    tx_type = Column(Enum(TransactionType), nullable=False, index=True)

    # Status
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, index=True)

    # Block info
    block_number = Column(Integer, nullable=True)
    block_hash = Column(String(66), nullable=True)

    # Addresses
    from_address = Column(String(42), nullable=False, index=True)
    to_address = Column(String(42), nullable=True)

    # Value (in Wei)
    value_wei = Column(String(78), nullable=True)

    # Gas info
    gas_used = Column(Integer, nullable=True)
    gas_price_wei = Column(String(78), nullable=True)

    # Related entities
    nft_id = Column(Integer, ForeignKey("nfts.id"), nullable=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Error info (for failed transactions)
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    # Relationships
    nft = relationship("NFT")
    listing = relationship("Listing")
    user = relationship("User")

    def __repr__(self):
        return f"<Transaction(hash={self.tx_hash[:10]}..., type={self.tx_type}, status={self.status})>"
