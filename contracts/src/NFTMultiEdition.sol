// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTMultiEdition
 * @dev ERC-1155 NFT contract for multi-edition artworks with royalties (EIP-2981)
 * @notice Allows minting multiple copies of the same artwork
 */
contract NFTMultiEdition is ERC1155, ERC1155Burnable, ERC1155Supply, ERC2981, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string public name;
    string public symbol;

    uint256 private _nextTokenTypeId;

    // Token type metadata
    struct TokenType {
        address creator;
        string uri;
        uint256 maxSupply;     // 0 = unlimited
        uint256 mintedSupply;
    }

    // Mapping from token type ID to token type info
    mapping(uint256 => TokenType) private _tokenTypes;

    // Default royalty percentage (in basis points, e.g., 500 = 5%)
    uint96 public defaultRoyaltyBps = 500;

    // Events
    event EditionCreated(
        uint256 indexed tokenTypeId,
        address indexed creator,
        string uri,
        uint256 maxSupply
    );

    event EditionMinted(
        uint256 indexed tokenTypeId,
        address indexed to,
        uint256 amount
    );

    event RoyaltyUpdated(
        uint256 indexed tokenTypeId,
        address indexed receiver,
        uint96 royaltyBps
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint96 _defaultRoyaltyBps
    ) ERC1155("") {
        name = _name;
        symbol = _symbol;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        if (_defaultRoyaltyBps > 0) {
            defaultRoyaltyBps = _defaultRoyaltyBps;
        }
    }

    /**
     * @dev Create a new edition type
     * @param creator Address of the original creator
     * @param tokenUri URI for metadata
     * @param maxSupply Maximum supply (0 for unlimited)
     * @return tokenTypeId The ID of the new token type
     */
    function createEdition(
        address creator,
        string memory tokenUri,
        uint256 maxSupply
    )
        public
        onlyRole(MINTER_ROLE)
        nonReentrant
        returns (uint256)
    {
        require(creator != address(0), "Creator cannot be zero address");
        require(bytes(tokenUri).length > 0, "URI cannot be empty");

        uint256 tokenTypeId = _nextTokenTypeId++;

        _tokenTypes[tokenTypeId] = TokenType({
            creator: creator,
            uri: tokenUri,
            maxSupply: maxSupply,
            mintedSupply: 0
        });

        // Set royalty for this token type
        _setTokenRoyalty(tokenTypeId, creator, defaultRoyaltyBps);

        emit EditionCreated(tokenTypeId, creator, tokenUri, maxSupply);

        return tokenTypeId;
    }

    /**
     * @dev Mint editions of an existing token type
     * @param to Address to mint to
     * @param tokenTypeId Token type ID to mint
     * @param amount Number of editions to mint
     */
    function mintEdition(address to, uint256 tokenTypeId, uint256 amount)
        public
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        require(amount > 0, "Amount must be greater than 0");
        require(_tokenTypes[tokenTypeId].creator != address(0), "Token type does not exist");

        TokenType storage tokenType = _tokenTypes[tokenTypeId];

        if (tokenType.maxSupply > 0) {
            require(
                tokenType.mintedSupply + amount <= tokenType.maxSupply,
                "Exceeds max supply"
            );
        }

        tokenType.mintedSupply += amount;
        _mint(to, tokenTypeId, amount, "");

        emit EditionMinted(tokenTypeId, to, amount);
    }

    /**
     * @dev Create and mint a new edition in one transaction
     * @param to Address to mint to
     * @param creator Address of the original creator
     * @param tokenUri URI for metadata
     * @param maxSupply Maximum supply (0 for unlimited)
     * @param amount Number of editions to mint initially
     * @return tokenTypeId The ID of the new token type
     */
    function createAndMint(
        address to,
        address creator,
        string memory tokenUri,
        uint256 maxSupply,
        uint256 amount
    )
        public
        onlyRole(MINTER_ROLE)
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Amount must be greater than 0");
        require(maxSupply == 0 || amount <= maxSupply, "Amount exceeds max supply");

        uint256 tokenTypeId = _nextTokenTypeId++;

        _tokenTypes[tokenTypeId] = TokenType({
            creator: creator,
            uri: tokenUri,
            maxSupply: maxSupply,
            mintedSupply: amount
        });

        _setTokenRoyalty(tokenTypeId, creator, defaultRoyaltyBps);
        _mint(to, tokenTypeId, amount, "");

        emit EditionCreated(tokenTypeId, creator, tokenUri, maxSupply);
        emit EditionMinted(tokenTypeId, to, amount);

        return tokenTypeId;
    }

    /**
     * @dev Update token royalty (only creator or admin)
     * @param tokenTypeId Token type ID to update
     * @param receiver Address to receive royalties
     * @param royaltyBps Royalty in basis points
     */
    function setTokenRoyalty(uint256 tokenTypeId, address receiver, uint96 royaltyBps)
        public
    {
        require(_tokenTypes[tokenTypeId].creator != address(0), "Token type does not exist");
        require(
            _tokenTypes[tokenTypeId].creator == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only creator or admin can set royalty"
        );
        require(royaltyBps <= 1000, "Royalty cannot exceed 10%");

        _setTokenRoyalty(tokenTypeId, receiver, royaltyBps);

        emit RoyaltyUpdated(tokenTypeId, receiver, royaltyBps);
    }

    /**
     * @dev Get token type information
     * @param tokenTypeId Token type ID
     * @return creator Creator address
     * @return tokenUri Token URI
     * @return maxSupply Maximum supply
     * @return mintedSupply Current minted supply
     */
    function getTokenType(uint256 tokenTypeId)
        public
        view
        returns (
            address creator,
            string memory tokenUri,
            uint256 maxSupply,
            uint256 mintedSupply
        )
    {
        TokenType storage tokenType = _tokenTypes[tokenTypeId];
        require(tokenType.creator != address(0), "Token type does not exist");

        return (
            tokenType.creator,
            tokenType.uri,
            tokenType.maxSupply,
            tokenType.mintedSupply
        );
    }

    /**
     * @dev Get the creator of a token type
     * @param tokenTypeId Token type ID
     * @return Creator address
     */
    function creatorOf(uint256 tokenTypeId) public view returns (address) {
        require(_tokenTypes[tokenTypeId].creator != address(0), "Token type does not exist");
        return _tokenTypes[tokenTypeId].creator;
    }

    /**
     * @dev Get total number of token types created
     * @return Total count
     */
    function totalTokenTypes() public view returns (uint256) {
        return _nextTokenTypeId;
    }

    /**
     * @dev Check if a token type exists
     * @param tokenTypeId Token type ID
     * @return True if exists
     */
    function tokenTypeExists(uint256 tokenTypeId) public view returns (bool) {
        return _tokenTypes[tokenTypeId].creator != address(0);
    }

    /**
     * @dev Get URI for a specific token type
     * @param tokenTypeId Token type ID
     * @return Token URI
     */
    function uri(uint256 tokenTypeId) public view override returns (string memory) {
        require(_tokenTypes[tokenTypeId].creator != address(0), "Token type does not exist");
        return _tokenTypes[tokenTypeId].uri;
    }

    // Required overrides

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
