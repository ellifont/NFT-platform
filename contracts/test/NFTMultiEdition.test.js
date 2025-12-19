const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTMultiEdition (ERC-1155)", function () {
  let nft;
  let owner;
  let minter;
  let user1;
  let user2;

  const NAME = "ArtworkEditions";
  const SYMBOL = "ARTE";
  const DEFAULT_ROYALTY_BPS = 500; // 5%

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

    const NFTMultiEdition = await ethers.getContractFactory("NFTMultiEdition");
    nft = await NFTMultiEdition.deploy(NAME, SYMBOL, DEFAULT_ROYALTY_BPS);
    await nft.waitForDeployment();

    // Grant minter role
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.grantRole(MINTER_ROLE, minter.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await nft.name()).to.equal(NAME);
      expect(await nft.symbol()).to.equal(SYMBOL);
    });

    it("Should set the correct default royalty", async function () {
      expect(await nft.defaultRoyaltyBps()).to.equal(DEFAULT_ROYALTY_BPS);
    });

    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
      expect(await nft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Edition Creation", function () {
    const TOKEN_URI = "ipfs://QmEdition123";
    const MAX_SUPPLY = 100;

    it("Should create a new edition", async function () {
      await nft.connect(minter).createEdition(user1.address, TOKEN_URI, MAX_SUPPLY);

      const tokenType = await nft.getTokenType(0);
      expect(tokenType.creator).to.equal(user1.address);
      expect(tokenType.tokenUri).to.equal(TOKEN_URI);
      expect(tokenType.maxSupply).to.equal(MAX_SUPPLY);
      expect(tokenType.mintedSupply).to.equal(0);
    });

    it("Should emit EditionCreated event", async function () {
      await expect(nft.connect(minter).createEdition(user1.address, TOKEN_URI, MAX_SUPPLY))
        .to.emit(nft, "EditionCreated")
        .withArgs(0, user1.address, TOKEN_URI, MAX_SUPPLY);
    });

    it("Should allow unlimited supply (maxSupply = 0)", async function () {
      await nft.connect(minter).createEdition(user1.address, TOKEN_URI, 0);

      const tokenType = await nft.getTokenType(0);
      expect(tokenType.maxSupply).to.equal(0);
    });

    it("Should fail with zero address creator", async function () {
      await expect(
        nft.connect(minter).createEdition(ethers.ZeroAddress, TOKEN_URI, MAX_SUPPLY)
      ).to.be.revertedWith("Creator cannot be zero address");
    });

    it("Should fail with empty URI", async function () {
      await expect(
        nft.connect(minter).createEdition(user1.address, "", MAX_SUPPLY)
      ).to.be.revertedWith("URI cannot be empty");
    });
  });

  describe("Minting Editions", function () {
    const TOKEN_URI = "ipfs://QmEditionMint";
    const MAX_SUPPLY = 10;

    beforeEach(async function () {
      await nft.connect(minter).createEdition(user1.address, TOKEN_URI, MAX_SUPPLY);
    });

    it("Should mint editions to user", async function () {
      await nft.connect(minter).mintEdition(user2.address, 0, 5);

      expect(await nft.balanceOf(user2.address, 0)).to.equal(5);
      // Use the specific function signature to avoid ambiguity
      expect(await nft["totalSupply(uint256)"](0)).to.equal(5);
    });

    it("Should emit EditionMinted event", async function () {
      await expect(nft.connect(minter).mintEdition(user2.address, 0, 5))
        .to.emit(nft, "EditionMinted")
        .withArgs(0, user2.address, 5);
    });

    it("Should update minted supply", async function () {
      await nft.connect(minter).mintEdition(user2.address, 0, 5);

      const tokenType = await nft.getTokenType(0);
      expect(tokenType.mintedSupply).to.equal(5);
    });

    it("Should fail if exceeds max supply", async function () {
      await expect(
        nft.connect(minter).mintEdition(user2.address, 0, 11)
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("Should allow minting up to max supply", async function () {
      await nft.connect(minter).mintEdition(user2.address, 0, 10);
      expect(await nft.balanceOf(user2.address, 0)).to.equal(10);
    });

    it("Should fail if token type doesn't exist", async function () {
      await expect(
        nft.connect(minter).mintEdition(user2.address, 999, 5)
      ).to.be.revertedWith("Token type does not exist");
    });

    it("Should fail with zero amount", async function () {
      await expect(
        nft.connect(minter).mintEdition(user2.address, 0, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Create and Mint", function () {
    const TOKEN_URI = "ipfs://QmCreateAndMint";

    it("Should create and mint in one transaction", async function () {
      await nft.connect(minter).createAndMint(user2.address, user1.address, TOKEN_URI, 100, 10);

      expect(await nft.balanceOf(user2.address, 0)).to.equal(10);
      expect(await nft.creatorOf(0)).to.equal(user1.address);
    });

    it("Should emit both events", async function () {
      const tx = nft.connect(minter).createAndMint(user2.address, user1.address, TOKEN_URI, 100, 10);

      await expect(tx).to.emit(nft, "EditionCreated");
      await expect(tx).to.emit(nft, "EditionMinted");
    });

    it("Should fail if amount exceeds max supply", async function () {
      await expect(
        nft.connect(minter).createAndMint(user2.address, user1.address, TOKEN_URI, 5, 10)
      ).to.be.revertedWith("Amount exceeds max supply");
    });
  });

  describe("Royalties (EIP-2981)", function () {
    const TOKEN_URI = "ipfs://QmRoyalty";
    const SALE_PRICE = ethers.parseEther("1");

    beforeEach(async function () {
      await nft.connect(minter).createEdition(user1.address, TOKEN_URI, 100);
    });

    it("Should return correct default royalty", async function () {
      const [receiver, amount] = await nft.royaltyInfo(0, SALE_PRICE);

      expect(receiver).to.equal(user1.address);
      expect(amount).to.equal(ethers.parseEther("0.05")); // 5%
    });

    it("Should allow creator to update royalty", async function () {
      await nft.connect(user1).setTokenRoyalty(0, user1.address, 1000);

      const [receiver, amount] = await nft.royaltyInfo(0, SALE_PRICE);
      expect(amount).to.equal(ethers.parseEther("0.1")); // 10%
    });

    it("Should fail if non-creator tries to update royalty", async function () {
      await expect(
        nft.connect(user2).setTokenRoyalty(0, user2.address, 300)
      ).to.be.revertedWith("Only creator or admin can set royalty");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await nft.connect(minter).createAndMint(user1.address, user1.address, "ipfs://burn", 100, 10);
    });

    it("Should allow holder to burn tokens", async function () {
      await nft.connect(user1).burn(user1.address, 0, 5);
      expect(await nft.balanceOf(user1.address, 0)).to.equal(5);
    });

    it("Should fail if trying to burn more than balance", async function () {
      await expect(
        nft.connect(user1).burn(user1.address, 0, 15)
      ).to.be.reverted;
    });
  });

  describe("URI", function () {
    const TOKEN_URI = "ipfs://QmUniqueURI";

    it("Should return correct URI for token type", async function () {
      await nft.connect(minter).createEdition(user1.address, TOKEN_URI, 100);
      expect(await nft.uri(0)).to.equal(TOKEN_URI);
    });

    it("Should fail for non-existent token type", async function () {
      await expect(nft.uri(999)).to.be.revertedWith("Token type does not exist");
    });
  });

  describe("Token Type Queries", function () {
    it("Should return total token types", async function () {
      await nft.connect(minter).createEdition(user1.address, "uri1", 100);
      await nft.connect(minter).createEdition(user1.address, "uri2", 50);

      expect(await nft.totalTokenTypes()).to.equal(2);
    });

    it("Should check token type existence", async function () {
      await nft.connect(minter).createEdition(user1.address, "uri", 100);

      expect(await nft.tokenTypeExists(0)).to.be.true;
      expect(await nft.tokenTypeExists(999)).to.be.false;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC1155", async function () {
      // ERC1155 interface ID: 0xd9b67a26
      expect(await nft.supportsInterface("0xd9b67a26")).to.be.true;
    });

    it("Should support ERC2981 (Royalty)", async function () {
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });
  });
});
