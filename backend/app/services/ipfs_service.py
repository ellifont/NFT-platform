"""IPFS service using Pinata for storing NFT metadata and images"""

import json
import httpx
from typing import Optional, BinaryIO
from datetime import datetime

from app.config import get_settings

settings = get_settings()


class PinataError(Exception):
    """Custom exception for Pinata API errors"""
    pass


class IPFSService:
    """Service for uploading files and metadata to IPFS via Pinata"""

    PINATA_API_URL = "https://api.pinata.cloud"
    PINATA_PIN_FILE_URL = f"{PINATA_API_URL}/pinning/pinFileToIPFS"
    PINATA_PIN_JSON_URL = f"{PINATA_API_URL}/pinning/pinJSONToIPFS"

    def __init__(self):
        self.api_key = settings.pinata_api_key
        self.secret_key = settings.pinata_secret_key
        self.gateway_url = settings.pinata_gateway_url

    @property
    def _headers(self) -> dict:
        """Get authentication headers for Pinata API"""
        return {
            "pinata_api_key": self.api_key,
            "pinata_secret_api_key": self.secret_key,
        }

    def is_configured(self) -> bool:
        """Check if Pinata is properly configured"""
        return bool(self.api_key and self.secret_key)

    async def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str = "image/png",
        metadata_name: Optional[str] = None
    ) -> dict:
        """
        Upload a file to IPFS via Pinata

        Args:
            file: File-like object to upload
            filename: Name of the file
            content_type: MIME type of the file
            metadata_name: Optional name for Pinata metadata

        Returns:
            dict with IpfsHash, PinSize, Timestamp
        """
        if not self.is_configured():
            raise PinataError("Pinata API keys not configured")

        pinata_metadata = {
            "name": metadata_name or filename,
            "keyvalues": {
                "uploaded_at": datetime.utcnow().isoformat(),
                "type": "nft_image"
            }
        }

        async with httpx.AsyncClient() as client:
            files = {
                "file": (filename, file, content_type)
            }
            data = {
                "pinataMetadata": json.dumps(pinata_metadata),
                "pinataOptions": json.dumps({"cidVersion": 1})
            }

            response = await client.post(
                self.PINATA_PIN_FILE_URL,
                headers=self._headers,
                files=files,
                data=data,
                timeout=60.0
            )

            if response.status_code != 200:
                raise PinataError(f"Failed to upload file: {response.text}")

            result = response.json()
            return {
                "ipfs_hash": result["IpfsHash"],
                "pin_size": result["PinSize"],
                "timestamp": result["Timestamp"],
                "ipfs_url": f"ipfs://{result['IpfsHash']}",
                "gateway_url": f"{self.gateway_url}{result['IpfsHash']}"
            }

    async def upload_json(
        self,
        data: dict,
        name: str,
        keyvalues: Optional[dict] = None
    ) -> dict:
        """
        Upload JSON data to IPFS via Pinata

        Args:
            data: JSON-serializable dictionary
            name: Name for the pin
            keyvalues: Optional key-value metadata

        Returns:
            dict with IpfsHash, PinSize, Timestamp
        """
        if not self.is_configured():
            raise PinataError("Pinata API keys not configured")

        pinata_metadata = {
            "name": name,
            "keyvalues": keyvalues or {
                "uploaded_at": datetime.utcnow().isoformat(),
                "type": "nft_metadata"
            }
        }

        payload = {
            "pinataContent": data,
            "pinataMetadata": pinata_metadata,
            "pinataOptions": {"cidVersion": 1}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.PINATA_PIN_JSON_URL,
                headers={**self._headers, "Content-Type": "application/json"},
                json=payload,
                timeout=30.0
            )

            if response.status_code != 200:
                raise PinataError(f"Failed to upload JSON: {response.text}")

            result = response.json()
            return {
                "ipfs_hash": result["IpfsHash"],
                "pin_size": result["PinSize"],
                "timestamp": result["Timestamp"],
                "ipfs_url": f"ipfs://{result['IpfsHash']}",
                "gateway_url": f"{self.gateway_url}{result['IpfsHash']}"
            }

    async def upload_nft_metadata(
        self,
        name: str,
        description: str,
        image_ipfs_url: str,
        attributes: Optional[list] = None,
        external_url: Optional[str] = None,
        animation_url: Optional[str] = None,
        creator: Optional[str] = None
    ) -> dict:
        """
        Upload NFT metadata following OpenSea metadata standard

        Args:
            name: NFT name
            description: NFT description
            image_ipfs_url: IPFS URL of the image (ipfs://...)
            attributes: List of attribute dicts [{"trait_type": "...", "value": "..."}]
            external_url: External URL for the NFT
            animation_url: Animation/video URL
            creator: Creator address

        Returns:
            dict with ipfs_hash, ipfs_url, gateway_url
        """
        metadata = {
            "name": name,
            "description": description,
            "image": image_ipfs_url,
        }

        if attributes:
            metadata["attributes"] = attributes

        if external_url:
            metadata["external_url"] = external_url

        if animation_url:
            metadata["animation_url"] = animation_url

        # Custom properties
        if creator:
            metadata["properties"] = {
                "creator": creator,
                "created_at": datetime.utcnow().isoformat()
            }

        return await self.upload_json(
            data=metadata,
            name=f"metadata_{name}",
            keyvalues={
                "type": "nft_metadata",
                "nft_name": name,
                "creator": creator or "unknown"
            }
        )

    async def fetch_metadata(self, ipfs_hash: str) -> dict:
        """
        Fetch metadata from IPFS

        Args:
            ipfs_hash: IPFS hash (CID) of the metadata

        Returns:
            Parsed JSON metadata
        """
        url = f"{self.gateway_url}{ipfs_hash}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)

            if response.status_code != 200:
                raise PinataError(f"Failed to fetch metadata: {response.status_code}")

            return response.json()

    def get_gateway_url(self, ipfs_url: str) -> str:
        """
        Convert ipfs:// URL to gateway URL

        Args:
            ipfs_url: IPFS URL (ipfs://QmXxx...)

        Returns:
            Gateway URL (https://gateway.pinata.cloud/ipfs/QmXxx...)
        """
        if ipfs_url.startswith("ipfs://"):
            ipfs_hash = ipfs_url[7:]  # Remove "ipfs://"
            return f"{self.gateway_url}{ipfs_hash}"
        return ipfs_url

    def get_ipfs_hash(self, ipfs_url: str) -> str:
        """
        Extract IPFS hash from URL

        Args:
            ipfs_url: IPFS URL or gateway URL

        Returns:
            IPFS hash (CID)
        """
        if ipfs_url.startswith("ipfs://"):
            return ipfs_url[7:]
        elif "/ipfs/" in ipfs_url:
            return ipfs_url.split("/ipfs/")[-1]
        return ipfs_url


# Singleton instance
ipfs_service = IPFSService()
