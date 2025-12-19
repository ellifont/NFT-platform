"""User model for wallet-based authentication"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """User model - identified by Ethereum wallet address"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(42), unique=True, index=True, nullable=False)

    # Profile info (optional)
    username = Column(String(50), unique=True, nullable=True)
    bio = Column(String(500), nullable=True)
    profile_image_url = Column(String(500), nullable=True)

    # Role flags
    is_artist = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)

    # Auth
    nonce = Column(String(64), nullable=True)  # For signature verification

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    owned_nfts = relationship("NFT", back_populates="owner", foreign_keys="NFT.owner_id")
    created_nfts = relationship("NFT", back_populates="creator", foreign_keys="NFT.creator_id")
    listings = relationship("Listing", back_populates="seller", foreign_keys="Listing.seller_id")
    mint_requests = relationship("MintRequest", back_populates="artist", foreign_keys="MintRequest.artist_id")

    def __repr__(self):
        return f"<User(id={self.id}, wallet={self.wallet_address[:10]}...)>"
