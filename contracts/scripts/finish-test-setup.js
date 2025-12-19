const hre = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await hre.ethers.getSigners();

  console.log("Finishing test setup...\n");

  // Get deployed contracts
  const nftAddress = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";
  const nftMultiAddress = "0x9A676e781A523b5d0C0e43731313A708CB607508";
  const marketplaceAddress = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";

  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = NFT.attach(nftAddress);

  const NFTMulti = await hre.ethers.getContractFactory("NFTMultiEdition");
  const nftMulti = NFTMulti.attach(nftMultiAddress);

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = Marketplace.attach(marketplaceAddress);

  console.log("=".repeat(60));
  console.log("MINTING ERC-1155 MULTI-EDITION NFTs");
  console.log("=".repeat(60));

  // Mint ERC-1155 NFTs (multi-edition)
  const multiEditionNFTs = [
    {
      name: "Limited Series #1",
      uri: "ipfs://QmTestMulti1/metadata.json",
      maxSupply: 10,
      mintAmount: 5,
    },
    {
      name: "Collector's Edition #2",
      uri: "ipfs://QmTestMulti2/metadata.json",
      maxSupply: 100,
      mintAmount: 20,
    },
  ];

  for (const nftData of multiEditionNFTs) {
    try {
      // Create and mint in one call
      const tx = await nftMulti.createAndMint(
        deployer.address,
        nftData.uri,
        nftData.maxSupply,
        nftData.mintAmount
      );
      const receipt = await tx.wait();

      // Get token type ID from the current counter
      const tokenTypeId = await nftMulti.currentTokenTypeId();

      console.log(`Created: ${nftData.name}`);
      console.log(`  Token Type ID: ${tokenTypeId}`);
      console.log(`  Max Supply: ${nftData.maxSupply}`);
      console.log(`  Minted: ${nftData.mintAmount}`);
      console.log(`  URI: ${nftData.uri}`);
      console.log("");
    } catch (e) {
      console.log(`Skipping ${nftData.name} (may already exist)`);
    }
  }

  console.log("=".repeat(60));
  console.log("CREATING MARKETPLACE LISTINGS");
  console.log("=".repeat(60));

  // Approve marketplace for NFT transfers
  console.log("Approving marketplace for NFT transfers...");
  await nft.connect(deployer).setApprovalForAll(marketplaceAddress, true);
  await nft.connect(user1).setApprovalForAll(marketplaceAddress, true);
  await nftMulti.connect(deployer).setApprovalForAll(marketplaceAddress, true);
  console.log("Approvals set.\n");

  // Create listings for some ERC-721 NFTs
  const listings = [
    { tokenId: 0, price: "0.5", name: "Cosmic Dreams #1", owner: deployer },
    { tokenId: 1, price: "1.0", name: "Digital Sunset #2", owner: deployer },
    { tokenId: 3, price: "2.5", name: "Neon City #4", owner: user1 },
  ];

  for (const listing of listings) {
    try {
      const priceWei = hre.ethers.parseEther(listing.price);
      const tx = await marketplace.connect(listing.owner).listERC721(nftAddress, listing.tokenId, priceWei);
      await tx.wait();

      const listingId = await marketplace.totalListings() - 1n;
      console.log(`Listed: ${listing.name}`);
      console.log(`  Listing ID: ${listingId}`);
      console.log(`  Token ID: ${listing.tokenId}`);
      console.log(`  Price: ${listing.price} ETH`);
      console.log("");
    } catch (e) {
      console.log(`Skipping listing for token ${listing.tokenId} (may already be listed or error: ${e.message})`);
    }
  }

  // List some ERC-1155 tokens
  try {
    const priceWei = hre.ethers.parseEther("0.1");
    await marketplace.connect(deployer).listERC1155(nftMultiAddress, 1, 3, priceWei);
    const listingId = await marketplace.totalListings() - 1n;
    console.log(`Listed: Limited Series #1 (3 editions)`);
    console.log(`  Listing ID: ${listingId}`);
    console.log(`  Token ID: 1`);
    console.log(`  Amount: 3`);
    console.log(`  Price: 0.1 ETH each`);
    console.log("");
  } catch (e) {
    console.log(`Skipping ERC-1155 listing (${e.message})`);
  }

  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const totalSupply = await nft.totalSupply();
  const totalListings = await marketplace.totalListings();

  console.log(`Total ERC-721 NFTs: ${totalSupply}`);
  console.log(`Total Marketplace Listings: ${totalListings}`);
  console.log("");
  console.log("Test Accounts:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  User1: ${user1.address}`);
  console.log(`  User2: ${user2.address}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
