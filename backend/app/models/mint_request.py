"""MintRequest model for artist mint request workflow"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class MintRequestStatus(str, enum.Enum):
    """Mint request status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MINTED = "minted"


class TokenStandardRequest(str, enum.Enum):
    """Requested token standard"""
    ERC721 = "ERC721"
    ERC1155 = "ERC1155"


class MintRequest(Base):
    """MintRequest model - tracks artist mint requests for approval"""

    __tablename__ = "mint_requests"

    id = Column(Integer, primary_key=True, index=True)

    # Artist who submitted the request
    artist_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Artwork details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    artwork_url = Column(String(500), nullable=False)  # Original artwork URL

    # NFT configuration
    token_standard = Column(Enum(TokenStandardRequest), default=TokenStandardRequest.ERC721)
    edition_size = Column(Integer, default=1)  # For ERC-1155: number of editions
    royalty_percentage = Column(Numeric(5, 2), default=5.0)  # Requested royalty

    # Metadata (to be uploaded to IPFS)
    metadata_name = Column(String(200), nullable=True)
    metadata_description = Column(Text, nullable=True)
    metadata_attributes = Column(Text, nullable=True)  # JSON string

    # IPFS URIs (populated after approval)
    image_ipfs_uri = Column(String(500), nullable=True)
    metadata_ipfs_uri = Column(String(500), nullable=True)

    # Status and review
    status = Column(Enum(MintRequestStatus), default=MintRequestStatus.PENDING, index=True)
    admin_notes = Column(Text, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Resulting NFT (populated after minting)
    nft_id = Column(Integer, ForeignKey("nfts.id"), nullable=True)
    mint_tx_hash = Column(String(66), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    minted_at = Column(DateTime, nullable=True)

    # Relationships
    artist = relationship("User", back_populates="mint_requests", foreign_keys=[artist_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by_id])
    nft = relationship("NFT")

    def __repr__(self):
        return f"<MintRequest(id={self.id}, title={self.title}, status={self.status})>"
