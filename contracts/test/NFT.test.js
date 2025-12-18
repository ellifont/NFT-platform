const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT (ERC-721)", function () {
  let nft;
  let owner;
  let minter;
  let user1;
  let user2;

  const NAME = "ArtworkNFT";
  const SYMBOL = "ART";
  const DEFAULT_ROYALTY_BPS = 500; // 5%

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.deploy(NAME, SYMBOL, DEFAULT_ROYALTY_BPS);
    await nft.waitForDeployment();

    // Grant minter role to minter
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

    it("Should grant minter role to deployer", async function () {
      const MINTER_ROLE = await nft.MINTER_ROLE();
      expect(await nft.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    const TOKEN_URI = "ipfs://QmTest123";

    it("Should mint NFT to user", async function () {
      await nft.connect(minter).mint(user1.address, TOKEN_URI);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.tokenURI(0)).to.equal(TOKEN_URI);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("Should set creator correctly", async function () {
      await nft.connect(minter).mint(user1.address, TOKEN_URI);
      expect(await nft.creatorOf(0)).to.equal(user1.address);
    });

    it("Should emit NFTMinted event", async function () {
      await expect(nft.connect(minter).mint(user1.address, TOKEN_URI))
        .to.emit(nft, "NFTMinted")
        .withArgs(0, user1.address, user1.address, TOKEN_URI);
    });

    it("Should fail if caller doesn't have minter role", async function () {
      await expect(
        nft.connect(user1).mint(user1.address, TOKEN_URI)
      ).to.be.reverted;
    });

    it("Should mint multiple NFTs with incrementing IDs", async function () {
      await nft.connect(minter).mint(user1.address, TOKEN_URI);
      await nft.connect(minter).mint(user2.address, TOKEN_URI);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.ownerOf(1)).to.equal(user2.address);
      expect(await nft.totalSupply()).to.equal(2);
    });
  });

  describe("MintFor (Mint Requests)", function () {
    const TOKEN_URI = "ipfs://QmArtwork456";

    it("Should mint NFT with different owner and creator", async function () {
      await nft.connect(minter).mintFor(user1.address, user2.address, TOKEN_URI);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
      expect(await nft.creatorOf(0)).to.equal(user2.address);
    });

    it("Should set royalty to creator, not owner", async function () {
      await nft.connect(minter).mintFor(user1.address, user2.address, TOKEN_URI);

      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(receiver).to.equal(user2.address);
    });

    it("Should fail with zero address creator", async function () {
      await expect(
        nft.connect(minter).mintFor(user1.address, ethers.ZeroAddress, TOKEN_URI)
      ).to.be.revertedWith("Creator cannot be zero address");
    });
  });

  describe("Royalties (EIP-2981)", function () {
    const TOKEN_URI = "ipfs://QmTest";
    const SALE_PRICE = ethers.parseEther("1");

    beforeEach(async function () {
      await nft.connect(minter).mint(user1.address, TOKEN_URI);
    });

    it("Should return correct default royalty", async function () {
      const [receiver, amount] = await nft.royaltyInfo(0, SALE_PRICE);

      expect(receiver).to.equal(user1.address);
      // 5% of 1 ETH = 0.05 ETH
      expect(amount).to.equal(ethers.parseEther("0.05"));
    });

    it("Should allow creator to update royalty", async function () {
      await nft.connect(user1).setTokenRoyalty(0, user1.address, 1000); // 10%

      const [receiver, amount] = await nft.royaltyInfo(0, SALE_PRICE);
      expect(amount).to.equal(ethers.parseEther("0.1"));
    });

    it("Should allow admin to update royalty", async function () {
      await nft.connect(owner).setTokenRoyalty(0, user2.address, 300);

      const [receiver, amount] = await nft.royaltyInfo(0, SALE_PRICE);
      expect(receiver).to.equal(user2.address);
      expect(amount).to.equal(ethers.parseEther("0.03"));
    });

    it("Should fail if non-creator/admin tries to update royalty", async function () {
      await expect(
        nft.connect(user2).setTokenRoyalty(0, user2.address, 300)
      ).to.be.revertedWith("Only creator or admin can set royalty");
    });

    it("Should fail if royalty exceeds 10%", async function () {
      await expect(
        nft.connect(user1).setTokenRoyalty(0, user1.address, 1001)
      ).to.be.revertedWith("Royalty cannot exceed 10%");
    });
  });

  describe("Burning", function () {
    const TOKEN_URI = "ipfs://QmBurn";

    beforeEach(async function () {
      await nft.connect(minter).mint(user1.address, TOKEN_URI);
    });

    it("Should allow owner to burn token", async function () {
      await nft.connect(user1).burn(0);
      expect(await nft.exists(0)).to.be.false;
    });

    it("Should fail if non-owner tries to burn", async function () {
      await expect(nft.connect(user2).burn(0)).to.be.reverted;
    });
  });

  describe("Token Existence", function () {
    it("Should return true for existing token", async function () {
      await nft.connect(minter).mint(user1.address, "ipfs://test");
      expect(await nft.exists(0)).to.be.true;
    });

    it("Should return false for non-existing token", async function () {
      expect(await nft.exists(999)).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update default royalty", async function () {
      await nft.connect(owner).setDefaultRoyalty(750); // 7.5%
      expect(await nft.defaultRoyaltyBps()).to.equal(750);
    });

    it("Should emit event when default royalty updated", async function () {
      await expect(nft.connect(owner).setDefaultRoyalty(750))
        .to.emit(nft, "DefaultRoyaltyUpdated")
        .withArgs(750);
    });

    it("Should fail if non-admin tries to update default royalty", async function () {
      await expect(nft.connect(user1).setDefaultRoyalty(750)).to.be.reverted;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721", async function () {
      // ERC721 interface ID: 0x80ac58cd
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC2981 (Royalty)", async function () {
      // ERC2981 interface ID: 0x2a55205a
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });

    it("Should support AccessControl", async function () {
      // AccessControl interface ID: 0x7965db0b
      expect(await nft.supportsInterface("0x7965db0b")).to.be.true;
    });
  });
});
