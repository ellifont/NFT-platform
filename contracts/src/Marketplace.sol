// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Marketplace
 * @dev NFT Marketplace supporting ERC-721 and ERC-1155 with royalties and platform fees
 * @notice Fixed-price marketplace for buying and selling NFTs
 */
contract Marketplace is Ownable, ReentrancyGuard, Pausable {
    // Token standards
    enum TokenStandard { ERC721, ERC1155 }

    // Listing status
    enum ListingStatus { Active, Sold, Cancelled }

    // Listing structure
    struct Listing {
        address seller;
        address tokenContract;
        uint256 tokenId;
        uint256 amount;         // 1 for ERC721, variable for ERC1155
        uint256 price;          // Price in wei
        TokenStandard standard;
        ListingStatus status;
        uint256 createdAt;
    }

    // Platform fee in basis points (e.g., 250 = 2.5%)
    uint256 public platformFeeBps = 250;

    // Fee recipient address
    address public feeRecipient;

    // Listing counter
    uint256 private _listingIdCounter;

    // Mapping from listing ID to listing
    mapping(uint256 => Listing) public listings;

    // Mapping from seller to their listing IDs
    mapping(address => uint256[]) private _sellerListings;

    // Events
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        TokenStandard standard
    );

    event Sale(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 platformFee,
        uint256 royaltyAmount,
        address royaltyReceiver
    );

    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev List an ERC-721 NFT for sale
     * @param tokenContract NFT contract address
     * @param tokenId Token ID to list
     * @param price Price in wei
     * @return listingId The ID of the new listing
     */
    function listERC721(
        address tokenContract,
        uint256 tokenId,
        uint256 price
    )
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        require(price > 0, "Price must be greater than 0");

        IERC721 nft = IERC721(tokenContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );

        uint256 listingId = _listingIdCounter++;

        listings[listingId] = Listing({
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenId: tokenId,
            amount: 1,
            price: price,
            standard: TokenStandard.ERC721,
            status: ListingStatus.Active,
            createdAt: block.timestamp
        });

        _sellerListings[msg.sender].push(listingId);

        emit Listed(listingId, msg.sender, tokenContract, tokenId, 1, price, TokenStandard.ERC721);

        return listingId;
    }

    /**
     * @dev List ERC-1155 tokens for sale
     * @param tokenContract NFT contract address
     * @param tokenId Token ID to list
     * @param amount Number of tokens to list
     * @param price Price per token in wei
     * @return listingId The ID of the new listing
     */
    function listERC1155(
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        uint256 price
    )
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        require(price > 0, "Price must be greater than 0");
        require(amount > 0, "Amount must be greater than 0");

        IERC1155 nft = IERC1155(tokenContract);
        require(nft.balanceOf(msg.sender, tokenId) >= amount, "Insufficient balance");
        require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        uint256 listingId = _listingIdCounter++;

        listings[listingId] = Listing({
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenId: tokenId,
            amount: amount,
            price: price,
            standard: TokenStandard.ERC1155,
            status: ListingStatus.Active,
            createdAt: block.timestamp
        });

        _sellerListings[msg.sender].push(listingId);

        emit Listed(listingId, msg.sender, tokenContract, tokenId, amount, price, TokenStandard.ERC1155);

        return listingId;
    }

    /**
     * @dev Buy a listed NFT
     * @param listingId Listing ID to purchase
     */
    function buy(uint256 listingId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        Listing storage listing = listings[listingId];

        require(listing.status == ListingStatus.Active, "Listing not active");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        require(msg.value == listing.price, "Incorrect payment amount");

        listing.status = ListingStatus.Sold;

        // Calculate fees
        uint256 platformFee = (listing.price * platformFeeBps) / 10000;
        uint256 royaltyAmount = 0;
        address royaltyReceiver = address(0);

        // Check for EIP-2981 royalty
        if (_supportsRoyalty(listing.tokenContract)) {
            (royaltyReceiver, royaltyAmount) = IERC2981(listing.tokenContract)
                .royaltyInfo(listing.tokenId, listing.price);

            // Cap royalty at 10% to prevent abuse
            uint256 maxRoyalty = (listing.price * 1000) / 10000;
            if (royaltyAmount > maxRoyalty) {
                royaltyAmount = maxRoyalty;
            }

            // Don't pay royalty to seller (they're already getting the sale price)
            if (royaltyReceiver == listing.seller) {
                royaltyAmount = 0;
            }
        }

        // Calculate seller proceeds
        uint256 sellerProceeds = listing.price - platformFee - royaltyAmount;

        // Transfer NFT to buyer
        if (listing.standard == TokenStandard.ERC721) {
            IERC721(listing.tokenContract).safeTransferFrom(
                listing.seller,
                msg.sender,
                listing.tokenId
            );
        } else {
            IERC1155(listing.tokenContract).safeTransferFrom(
                listing.seller,
                msg.sender,
                listing.tokenId,
                listing.amount,
                ""
            );
        }

        // Transfer payments
        if (platformFee > 0) {
            _transferETH(feeRecipient, platformFee);
        }

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            _transferETH(royaltyReceiver, royaltyAmount);
        }

        _transferETH(listing.seller, sellerProceeds);

        emit Sale(
            listingId,
            msg.sender,
            listing.seller,
            listing.price,
            platformFee,
            royaltyAmount,
            royaltyReceiver
        );
    }

    /**
     * @dev Cancel a listing
     * @param listingId Listing ID to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        require(listing.status == ListingStatus.Active, "Listing not active");
        require(listing.seller == msg.sender || msg.sender == owner(), "Not authorized");

        listing.status = ListingStatus.Cancelled;

        emit ListingCancelled(listingId, listing.seller);
    }

    /**
     * @dev Update platform fee (owner only)
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @dev Update fee recipient (owner only)
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @dev Pause the marketplace (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the marketplace (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Get listing details
     * @param listingId Listing ID
     * @return Listing struct
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @dev Get all listing IDs for a seller
     * @param seller Seller address
     * @return Array of listing IDs
     */
    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return _sellerListings[seller];
    }

    /**
     * @dev Get total number of listings
     * @return Total count
     */
    function totalListings() external view returns (uint256) {
        return _listingIdCounter;
    }

    /**
     * @dev Check if a listing is active
     * @param listingId Listing ID
     * @return True if active
     */
    function isListingActive(uint256 listingId) external view returns (bool) {
        return listings[listingId].status == ListingStatus.Active;
    }

    /**
     * @dev Internal function to transfer ETH
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferETH(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @dev Check if contract supports EIP-2981
     * @param tokenContract Contract to check
     * @return True if supports royalty
     */
    function _supportsRoyalty(address tokenContract) internal view returns (bool) {
        try IERC165(tokenContract).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
