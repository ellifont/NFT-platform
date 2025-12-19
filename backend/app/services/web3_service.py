"""Web3 service for interacting with Ethereum and smart contracts"""

import json
from pathlib import Path
from typing import Optional, Tuple
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

from app.config import get_settings

settings = get_settings()


class Web3Service:
    """Service for Web3 interactions with Ethereum blockchain"""

    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.ethereum_rpc_url))

        # Contract ABIs (loaded from compiled artifacts)
        self._nft_abi: Optional[list] = None
        self._nft_multi_abi: Optional[list] = None
        self._marketplace_abi: Optional[list] = None

        # Contract instances
        self._nft_contract = None
        self._nft_multi_contract = None
        self._marketplace_contract = None

    @property
    def is_connected(self) -> bool:
        """Check if connected to Ethereum node"""
        return self.w3.is_connected()

    @property
    def chain_id(self) -> int:
        """Get current chain ID"""
        return self.w3.eth.chain_id

    def get_balance(self, address: str) -> int:
        """Get ETH balance of address in Wei"""
        return self.w3.eth.get_balance(Web3.to_checksum_address(address))

    def get_balance_eth(self, address: str) -> float:
        """Get ETH balance of address in ETH"""
        balance_wei = self.get_balance(address)
        return float(Web3.from_wei(balance_wei, "ether"))

    # ==================== ABI Loading ====================

    def _load_abi(self, artifact_path: str) -> list:
        """Load ABI from Hardhat artifact file"""
        try:
            with open(artifact_path, "r") as f:
                artifact = json.load(f)
                return artifact.get("abi", [])
        except FileNotFoundError:
            # Return minimal ABI if artifact not found
            return []

    def get_nft_abi(self) -> list:
        """Get NFT contract ABI"""
        if self._nft_abi is None:
            artifact_path = Path(__file__).parent.parent.parent.parent / "contracts" / "artifacts" / "src" / "NFT.sol" / "NFT.json"
            self._nft_abi = self._load_abi(str(artifact_path))
        return self._nft_abi

    def get_nft_multi_abi(self) -> list:
        """Get NFTMultiEdition contract ABI"""
        if self._nft_multi_abi is None:
            artifact_path = Path(__file__).parent.parent.parent.parent / "contracts" / "artifacts" / "src" / "NFTMultiEdition.sol" / "NFTMultiEdition.json"
            self._nft_multi_abi = self._load_abi(str(artifact_path))
        return self._nft_multi_abi

    def get_marketplace_abi(self) -> list:
        """Get Marketplace contract ABI"""
        if self._marketplace_abi is None:
            artifact_path = Path(__file__).parent.parent.parent.parent / "contracts" / "artifacts" / "src" / "Marketplace.sol" / "Marketplace.json"
            self._marketplace_abi = self._load_abi(str(artifact_path))
        return self._marketplace_abi

    # ==================== Contract Instances ====================

    def get_nft_contract(self, address: Optional[str] = None):
        """Get NFT contract instance"""
        contract_address = address or settings.nft_contract_address
        if not contract_address:
            raise ValueError("NFT contract address not configured")
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=self.get_nft_abi()
        )

    def get_nft_multi_contract(self, address: Optional[str] = None):
        """Get NFTMultiEdition contract instance"""
        contract_address = address or settings.nft_multi_edition_address
        if not contract_address:
            raise ValueError("NFTMultiEdition contract address not configured")
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=self.get_nft_multi_abi()
        )

    def get_marketplace_contract(self, address: Optional[str] = None):
        """Get Marketplace contract instance"""
        contract_address = address or settings.marketplace_contract_address
        if not contract_address:
            raise ValueError("Marketplace contract address not configured")
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=self.get_marketplace_abi()
        )

    # ==================== Signature Verification ====================

    def verify_signature(self, message: str, signature: str, expected_address: str) -> bool:
        """
        Verify an Ethereum signature

        Args:
            message: The original message that was signed
            signature: The signature (hex string)
            expected_address: The expected signer address

        Returns:
            True if signature is valid and from expected address
        """
        try:
            message_hash = encode_defunct(text=message)
            recovered_address = Account.recover_message(message_hash, signature=signature)
            return recovered_address.lower() == expected_address.lower()
        except Exception:
            return False

    def recover_signer(self, message: str, signature: str) -> Optional[str]:
        """
        Recover the signer address from a signature

        Args:
            message: The original message that was signed
            signature: The signature (hex string)

        Returns:
            The recovered address or None if invalid
        """
        try:
            message_hash = encode_defunct(text=message)
            return Account.recover_message(message_hash, signature=signature)
        except Exception:
            return None

    # ==================== NFT Contract Methods ====================

    def get_nft_owner(self, token_id: int, contract_address: Optional[str] = None) -> str:
        """Get owner of an ERC-721 NFT"""
        contract = self.get_nft_contract(contract_address)
        return contract.functions.ownerOf(token_id).call()

    def get_nft_token_uri(self, token_id: int, contract_address: Optional[str] = None) -> str:
        """Get token URI of an ERC-721 NFT"""
        contract = self.get_nft_contract(contract_address)
        return contract.functions.tokenURI(token_id).call()

    def get_nft_creator(self, token_id: int, contract_address: Optional[str] = None) -> str:
        """Get creator of an ERC-721 NFT"""
        contract = self.get_nft_contract(contract_address)
        return contract.functions.creatorOf(token_id).call()

    def get_nft_royalty_info(self, token_id: int, sale_price: int, contract_address: Optional[str] = None) -> Tuple[str, int]:
        """Get royalty info for an NFT"""
        contract = self.get_nft_contract(contract_address)
        return contract.functions.royaltyInfo(token_id, sale_price).call()

    def get_nft_total_supply(self, contract_address: Optional[str] = None) -> int:
        """Get total supply of NFTs"""
        contract = self.get_nft_contract(contract_address)
        return contract.functions.totalSupply().call()

    # ==================== NFTMultiEdition Contract Methods ====================

    def get_multi_balance(self, owner: str, token_id: int, contract_address: Optional[str] = None) -> int:
        """Get balance of ERC-1155 tokens"""
        contract = self.get_nft_multi_contract(contract_address)
        return contract.functions.balanceOf(
            Web3.to_checksum_address(owner),
            token_id
        ).call()

    def get_multi_token_type(self, token_id: int, contract_address: Optional[str] = None) -> dict:
        """Get token type info for ERC-1155"""
        contract = self.get_nft_multi_contract(contract_address)
        result = contract.functions.getTokenType(token_id).call()
        return {
            "creator": result[0],
            "uri": result[1],
            "max_supply": result[2],
            "minted_supply": result[3]
        }

    # ==================== Marketplace Contract Methods ====================

    def get_listing(self, listing_id: int, contract_address: Optional[str] = None) -> dict:
        """Get listing details from marketplace"""
        contract = self.get_marketplace_contract(contract_address)
        result = contract.functions.getListing(listing_id).call()
        return {
            "seller": result[0],
            "token_contract": result[1],
            "token_id": result[2],
            "amount": result[3],
            "price": result[4],
            "standard": "ERC721" if result[5] == 0 else "ERC1155",
            "status": ["active", "sold", "cancelled"][result[6]],
            "created_at": result[7]
        }

    def get_platform_fee(self, contract_address: Optional[str] = None) -> int:
        """Get platform fee in basis points"""
        contract = self.get_marketplace_contract(contract_address)
        return contract.functions.platformFeeBps().call()

    def is_listing_active(self, listing_id: int, contract_address: Optional[str] = None) -> bool:
        """Check if a listing is active"""
        contract = self.get_marketplace_contract(contract_address)
        return contract.functions.isListingActive(listing_id).call()

    # ==================== Transaction Building ====================

    def build_mint_tx(
        self,
        to_address: str,
        token_uri: str,
        from_address: str,
        contract_address: Optional[str] = None
    ) -> dict:
        """Build a mint transaction (unsigned)"""
        contract = self.get_nft_contract(contract_address)

        tx = contract.functions.mint(
            Web3.to_checksum_address(to_address),
            token_uri
        ).build_transaction({
            "from": Web3.to_checksum_address(from_address),
            "nonce": self.w3.eth.get_transaction_count(Web3.to_checksum_address(from_address)),
            "gas": 300000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": self.chain_id
        })

        return tx

    def build_list_erc721_tx(
        self,
        token_contract: str,
        token_id: int,
        price_wei: int,
        from_address: str,
        marketplace_address: Optional[str] = None
    ) -> dict:
        """Build a list ERC-721 transaction (unsigned)"""
        contract = self.get_marketplace_contract(marketplace_address)

        tx = contract.functions.listERC721(
            Web3.to_checksum_address(token_contract),
            token_id,
            price_wei
        ).build_transaction({
            "from": Web3.to_checksum_address(from_address),
            "nonce": self.w3.eth.get_transaction_count(Web3.to_checksum_address(from_address)),
            "gas": 200000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": self.chain_id
        })

        return tx

    def build_buy_tx(
        self,
        listing_id: int,
        price_wei: int,
        from_address: str,
        marketplace_address: Optional[str] = None
    ) -> dict:
        """Build a buy transaction (unsigned)"""
        contract = self.get_marketplace_contract(marketplace_address)

        tx = contract.functions.buy(listing_id).build_transaction({
            "from": Web3.to_checksum_address(from_address),
            "value": price_wei,
            "nonce": self.w3.eth.get_transaction_count(Web3.to_checksum_address(from_address)),
            "gas": 300000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": self.chain_id
        })

        return tx

    # ==================== Utility Methods ====================

    @staticmethod
    def to_wei(amount_eth: float) -> int:
        """Convert ETH to Wei"""
        return Web3.to_wei(amount_eth, "ether")

    @staticmethod
    def from_wei(amount_wei: int) -> float:
        """Convert Wei to ETH"""
        return float(Web3.from_wei(amount_wei, "ether"))

    @staticmethod
    def is_valid_address(address: str) -> bool:
        """Check if address is valid Ethereum address"""
        return Web3.is_address(address)

    @staticmethod
    def to_checksum_address(address: str) -> str:
        """Convert address to checksum format"""
        return Web3.to_checksum_address(address)


# Singleton instance
web3_service = Web3Service()
