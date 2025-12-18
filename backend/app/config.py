"""Application configuration using Pydantic Settings"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App settings
    app_name: str = "NFT Marketplace API"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///./nft_marketplace.db"

    # JWT Authentication
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Ethereum/Web3
    ethereum_rpc_url: str = "http://127.0.0.1:8545"
    chain_id: int = 31337

    # Contract addresses (set after deployment)
    nft_contract_address: str = ""
    nft_multi_edition_address: str = ""
    marketplace_contract_address: str = ""

    # Pinata IPFS
    pinata_api_key: str = ""
    pinata_secret_key: str = ""
    pinata_gateway_url: str = "https://gateway.pinata.cloud/ipfs/"

    # Platform settings
    platform_fee_percent: float = 2.5  # 2.5% platform fee
    default_royalty_percent: float = 5.0  # 5% default royalty

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
