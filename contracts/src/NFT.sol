// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFT
 * @dev ERC-721 NFT contract with minting, royalties (EIP-2981), and access control
 * @notice Single edition NFTs for the marketplace
 */
contract NFT is ERC721, ERC721URIStorage, ERC721Burnable, ERC2981, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;

    // Mapping from token ID to creator address
    mapping(uint256 => address) private _creators;

    // Default royalty percentage (in basis points, e.g., 500 = 5%)
    uint96 public defaultRoyaltyBps = 500;

    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed owner,
        string tokenURI
    );

    event RoyaltyUpdated(
        uint256 indexed tokenId,
        address indexed receiver,
        uint96 royaltyBps
    );

    event DefaultRoyaltyUpdated(uint96 newRoyaltyBps);

    constructor(
        string memory name,
        string memory symbol,
        uint96 _defaultRoyaltyBps
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        if (_defaultRoyaltyBps > 0) {
            defaultRoyaltyBps = _defaultRoyaltyBps;
        }
    }

    /**
     * @dev Mint a new NFT
     * @param to Address to mint the NFT to
     * @param uri Token URI for metadata
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
        nonReentrant
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = to;

        // Set default royalty for creator
        _setTokenRoyalty(tokenId, to, defaultRoyaltyBps);

        emit NFTMinted(tokenId, to, to, uri);

        return tokenId;
    }

    /**
     * @dev Mint NFT to a specific address with a different creator (for mint requests)
     * @param to Address to mint the NFT to (owner)
     * @param creator Address of the original creator (receives royalties)
     * @param uri Token URI for metadata
     * @return tokenId The ID of the newly minted token
     */
    function mintFor(address to, address creator, string memory uri)
        public
        onlyRole(MINTER_ROLE)
        nonReentrant
        returns (uint256)
    {
        require(creator != address(0), "Creator cannot be zero address");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = creator;

        // Set royalty for the creator
        _setTokenRoyalty(tokenId, creator, defaultRoyaltyBps);

        emit NFTMinted(tokenId, creator, to, uri);

        return tokenId;
    }

    /**
     * @dev Update token royalty (only creator or admin can update)
     * @param tokenId Token ID to update
     * @param receiver Address to receive royalties
     * @param royaltyBps Royalty in basis points (max 10000 = 100%)
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 royaltyBps)
        public
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(
            _creators[tokenId] == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only creator or admin can set royalty"
        );
        require(royaltyBps <= 1000, "Royalty cannot exceed 10%");

        _setTokenRoyalty(tokenId, receiver, royaltyBps);

        emit RoyaltyUpdated(tokenId, receiver, royaltyBps);
    }

    /**
     * @dev Update default royalty percentage (admin only)
     * @param newRoyaltyBps New default royalty in basis points
     */
    function setDefaultRoyalty(uint96 newRoyaltyBps)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newRoyaltyBps <= 1000, "Royalty cannot exceed 10%");
        defaultRoyaltyBps = newRoyaltyBps;
        emit DefaultRoyaltyUpdated(newRoyaltyBps);
    }

    /**
     * @dev Get the creator of a token
     * @param tokenId Token ID
     * @return Creator address
     */
    function creatorOf(uint256 tokenId) public view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _creators[tokenId];
    }

    /**
     * @dev Get total number of minted tokens
     * @return Total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Check if a token exists
     * @param tokenId Token ID to check
     * @return True if token exists
     */
    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // Required overrides for Solidity

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
