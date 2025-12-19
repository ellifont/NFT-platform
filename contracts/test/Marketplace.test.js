const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let marketplace;
  let nft;
  let nftMulti;
  let owner;
  let seller;
  let buyer;
  let feeRecipient;

  const PLATFORM_FEE_BPS = 250; // 2.5%
  const ROYALTY_BPS = 500; // 5%

  beforeEach(async function () {
    [owner, seller, buyer, feeRecipient] = await ethers.getSigners();

    // Deploy NFT contracts
    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy("TestNFT", "TNFT", ROYALTY_BPS);
    await nft.waitForDeployment();

    const NFTMultiEdition = await ethers.getContractFactory("NFTMultiEdition");
    nftMulti = await NFTMultiEdition.deploy("TestEditions", "TEDN", ROYALTY_BPS);
    await nftMulti.waitForDeployment();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(feeRecipient.address);
    await marketplace.waitForDeployment();

    // Mint NFTs for testing
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.grantRole(MINTER_ROLE, seller.address);
    await nftMulti.grantRole(MINTER_ROLE, seller.address);

    // Mint ERC-721
    await nft.connect(seller).mint(seller.address, "ipfs://token721");

    // Mint ERC-1155
    await nftMulti.connect(seller).createAndMint(seller.address, seller.address, "ipfs://token1155", 100, 10);
  });

  describe("Deployment", function () {
    it("Should set the correct fee recipient", async function () {
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the correct platform fee", async function () {
      expect(await marketplace.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });

    it("Should set the correct owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });
  });

  describe("ERC-721 Listing", function () {
    const PRICE = ethers.parseEther("1");

    beforeEach(async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
    });

    it("Should list ERC-721 NFT", async function () {
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE);

      const listing = await marketplace.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.tokenContract).to.equal(await nft.getAddress());
      expect(listing.tokenId).to.equal(0);
      expect(listing.price).to.equal(PRICE);
      expect(listing.standard).to.equal(0); // ERC721
      expect(listing.status).to.equal(0); // Active
    });

    it("Should emit Listed event", async function () {
      await expect(marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE))
        .to.emit(marketplace, "Listed")
        .withArgs(0, seller.address, await nft.getAddress(), 0, 1, PRICE, 0);
    });

    it("Should fail if not token owner", async function () {
      await expect(
        marketplace.connect(buyer).listERC721(await nft.getAddress(), 0, PRICE)
      ).to.be.revertedWith("Not token owner");
    });

    it("Should fail if marketplace not approved", async function () {
      // Revoke approval
      await nft.connect(seller).approve(ethers.ZeroAddress, 0);

      await expect(
        marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE)
      ).to.be.revertedWith("Marketplace not approved");
    });

    it("Should fail with zero price", async function () {
      await expect(
        marketplace.connect(seller).listERC721(await nft.getAddress(), 0, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });
  });

  describe("ERC-1155 Listing", function () {
    const PRICE = ethers.parseEther("0.5");
    const AMOUNT = 5;

    beforeEach(async function () {
      await nftMulti.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
    });

    it("Should list ERC-1155 tokens", async function () {
      await marketplace.connect(seller).listERC1155(await nftMulti.getAddress(), 0, AMOUNT, PRICE);

      const listing = await marketplace.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.amount).to.equal(AMOUNT);
      expect(listing.price).to.equal(PRICE);
      expect(listing.standard).to.equal(1); // ERC1155
    });

    it("Should fail if insufficient balance", async function () {
      await expect(
        marketplace.connect(seller).listERC1155(await nftMulti.getAddress(), 0, 100, PRICE)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should fail with zero amount", async function () {
      await expect(
        marketplace.connect(seller).listERC1155(await nftMulti.getAddress(), 0, 0, PRICE)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Buying ERC-721", function () {
    const PRICE = ethers.parseEther("1");

    beforeEach(async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE);
    });

    it("Should transfer NFT to buyer", async function () {
      await marketplace.connect(buyer).buy(0, { value: PRICE });

      expect(await nft.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should update listing status to Sold", async function () {
      await marketplace.connect(buyer).buy(0, { value: PRICE });

      const listing = await marketplace.getListing(0);
      expect(listing.status).to.equal(1); // Sold
    });

    it("Should distribute fees correctly", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      await marketplace.connect(buyer).buy(0, { value: PRICE });

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      // Platform fee: 2.5% of 1 ETH = 0.025 ETH
      const platformFee = ethers.parseEther("0.025");
      // Royalty: 5% of 1 ETH = 0.05 ETH (but seller is also creator, so no royalty)
      // Since seller is creator, royalty = 0
      // Seller receives: 1 - 0.025 = 0.975 ETH

      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(platformFee);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(PRICE - platformFee);
    });

    it("Should emit Sale event", async function () {
      await expect(marketplace.connect(buyer).buy(0, { value: PRICE }))
        .to.emit(marketplace, "Sale");
    });

    it("Should fail with incorrect payment", async function () {
      await expect(
        marketplace.connect(buyer).buy(0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should fail if buyer is seller", async function () {
      await expect(
        marketplace.connect(seller).buy(0, { value: PRICE })
      ).to.be.revertedWith("Cannot buy own listing");
    });

    it("Should fail if listing not active", async function () {
      await marketplace.connect(buyer).buy(0, { value: PRICE });

      await expect(
        marketplace.connect(buyer).buy(0, { value: PRICE })
      ).to.be.revertedWith("Listing not active");
    });
  });

  describe("Buying ERC-1155", function () {
    const PRICE = ethers.parseEther("0.5");
    const AMOUNT = 5;

    beforeEach(async function () {
      await nftMulti.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(seller).listERC1155(await nftMulti.getAddress(), 0, AMOUNT, PRICE);
    });

    it("Should transfer tokens to buyer", async function () {
      await marketplace.connect(buyer).buy(0, { value: PRICE });

      expect(await nftMulti.balanceOf(buyer.address, 0)).to.equal(AMOUNT);
    });
  });

  describe("Royalty Distribution", function () {
    const PRICE = ethers.parseEther("1");

    it("Should pay royalty to creator when different from seller", async function () {
      // Mint NFT to seller but set a different creator
      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, owner.address);
      await nft.connect(owner).mintFor(seller.address, owner.address, "ipfs://withRoyalty");

      // Seller lists the NFT (token ID 1 since we minted one in beforeEach)
      await nft.connect(seller).approve(await marketplace.getAddress(), 1);
      const listingTx = await marketplace.connect(seller).listERC721(await nft.getAddress(), 1, PRICE);
      const listingReceipt = await listingTx.wait();

      // Get the listing ID from the event
      const listingId = await marketplace.totalListings() - 1n;

      const creatorBalanceBefore = await ethers.provider.getBalance(owner.address);

      await marketplace.connect(buyer).buy(listingId, { value: PRICE });

      const creatorBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Royalty: 5% of 1 ETH = 0.05 ETH
      const expectedRoyalty = ethers.parseEther("0.05");
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(expectedRoyalty);
    });
  });

  describe("Cancel Listing", function () {
    const PRICE = ethers.parseEther("1");

    beforeEach(async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE);
    });

    it("Should allow seller to cancel listing", async function () {
      await marketplace.connect(seller).cancelListing(0);

      const listing = await marketplace.getListing(0);
      expect(listing.status).to.equal(2); // Cancelled
    });

    it("Should emit ListingCancelled event", async function () {
      await expect(marketplace.connect(seller).cancelListing(0))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(0, seller.address);
    });

    it("Should allow owner to cancel any listing", async function () {
      await marketplace.connect(owner).cancelListing(0);

      const listing = await marketplace.getListing(0);
      expect(listing.status).to.equal(2);
    });

    it("Should fail if non-seller/owner tries to cancel", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(0)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should fail if listing not active", async function () {
      await marketplace.connect(seller).cancelListing(0);

      await expect(
        marketplace.connect(seller).cancelListing(0)
      ).to.be.revertedWith("Listing not active");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      await marketplace.connect(owner).setPlatformFee(500); // 5%
      expect(await marketplace.platformFeeBps()).to.equal(500);
    });

    it("Should emit PlatformFeeUpdated event", async function () {
      await expect(marketplace.connect(owner).setPlatformFee(500))
        .to.emit(marketplace, "PlatformFeeUpdated")
        .withArgs(250, 500);
    });

    it("Should fail if fee exceeds 10%", async function () {
      await expect(
        marketplace.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should allow owner to update fee recipient", async function () {
      await marketplace.connect(owner).setFeeRecipient(buyer.address);
      expect(await marketplace.feeRecipient()).to.equal(buyer.address);
    });

    it("Should fail with zero address fee recipient", async function () {
      await expect(
        marketplace.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Pause/Unpause", function () {
    const PRICE = ethers.parseEther("1");

    beforeEach(async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
    });

    it("Should prevent listing when paused", async function () {
      await marketplace.connect(owner).pause();

      await expect(
        marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE)
      ).to.be.reverted;
    });

    it("Should prevent buying when paused", async function () {
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE);
      await marketplace.connect(owner).pause();

      await expect(
        marketplace.connect(buyer).buy(0, { value: PRICE })
      ).to.be.reverted;
    });

    it("Should allow operations after unpause", async function () {
      await marketplace.connect(owner).pause();
      await marketplace.connect(owner).unpause();

      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, PRICE);
      const listing = await marketplace.getListing(0);
      expect(listing.status).to.equal(0); // Active
    });
  });

  describe("Queries", function () {
    it("Should return seller listings", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, ethers.parseEther("1"));

      const listings = await marketplace.getSellerListings(seller.address);
      expect(listings.length).to.equal(1);
      expect(listings[0]).to.equal(0);
    });

    it("Should return total listings", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, ethers.parseEther("1"));

      expect(await marketplace.totalListings()).to.equal(1);
    });

    it("Should check if listing is active", async function () {
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).listERC721(await nft.getAddress(), 0, ethers.parseEther("1"));

      expect(await marketplace.isListingActive(0)).to.be.true;
    });
  });
});
