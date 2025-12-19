"""NFT model for tracking minted NFTs"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class TokenStandard(str, enum.Enum):
    """NFT token standard"""
    ERC721 = "ERC721"
    ERC1155 = "ERC1155"


class NFT(Base):
    """NFT model - tracks minted NFTs on the blockchain"""

    __tablename__ = "nfts"

    id = Column(Integer, primary_key=True, index=True)

    # Blockchain identifiers
    token_id = Column(Integer, nullable=False, index=True)
    contract_address = Column(String(42), nullable=False, index=True)
    token_standard = Column(Enum(TokenStandard), default=TokenStandard.ERC721)

    # For ERC-1155: amount owned (ERC-721 is always 1)
    amount = Column(Integer, default=1)

    # Metadata
    name = Column(String(200), nullable=True)
    description = Column(String(2000), nullable=True)
    image_url = Column(String(500), nullable=True)
    metadata_uri = Column(String(500), nullable=False)  # IPFS URI

    # Ownership and creation
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Royalty info (cached from contract)
    royalty_percentage = Column(Numeric(5, 2), default=5.0)  # e.g., 5.00%

    # Transaction info
    mint_tx_hash = Column(String(66), nullable=True, index=True)
    block_number = Column(Integer, nullable=True)

    # Status
    is_listed = Column(Boolean, default=False)
    is_burned = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="owned_nfts", foreign_keys=[owner_id])
    creator = relationship("User", back_populates="created_nfts", foreign_keys=[creator_id])
    listings = relationship("Listing", back_populates="nft")

    # Unique constraint: one record per token_id + contract_address
    __table_args__ = (
        # UniqueConstraint('token_id', 'contract_address', name='unique_token'),
    )

    def __repr__(self):
        return f"<NFT(id={self.id}, token_id={self.token_id}, standard={self.token_standard})>"
