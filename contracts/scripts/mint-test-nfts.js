const hre = require("hardhat");

async function main() {
  const [deployer, user1, user2] = await hre.ethers.getSigners();

  console.log("Minting test NFTs...\n");

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

  // Sample metadata URIs (using placeholder IPFS URIs)
  const sampleNFTs = [
    {
      name: "Cosmic Dreams #1",
      uri: "ipfs://QmTest1CosmicDreams/metadata.json",
      description: "A journey through cosmic nebulae",
    },
    {
      name: "Digital Sunset #2",
      uri: "ipfs://QmTest2DigitalSunset/metadata.json",
      description: "Vibrant digital sunset over mountains",
    },
    {
      name: "Abstract Flow #3",
      uri: "ipfs://QmTest3AbstractFlow/metadata.json",
      description: "Flowing abstract patterns in motion",
    },
    {
      name: "Neon City #4",
      uri: "ipfs://QmTest4NeonCity/metadata.json",
      description: "Cyberpunk cityscape at night",
    },
    {
      name: "Ocean Waves #5",
      uri: "ipfs://QmTest5OceanWaves/metadata.json",
      description: "Peaceful ocean waves at dawn",
    },
  ];

  console.log("=".repeat(60));
  console.log("MINTING ERC-721 NFTs");
  console.log("=".repeat(60));

  // Mint ERC-721 NFTs
  for (let i = 0; i < sampleNFTs.length; i++) {
    const nftData = sampleNFTs[i];
    const recipient = i < 3 ? deployer.address : user1.address;

    const tx = await nft.mint(recipient, nftData.uri);
    const receipt = await tx.wait();

    // Get token ID from event
    const transferEvent = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "Transfer"
    );
    const tokenId = transferEvent ? transferEvent.args[2] : i;

    console.log(`Minted: ${nftData.name}`);
    console.log(`  Token ID: ${tokenId}`);
    console.log(`  Owner: ${recipient}`);
    console.log(`  URI: ${nftData.uri}`);
    console.log("");
  }

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
  }

  console.log("=".repeat(60));
  console.log("CREATING MARKETPLACE LISTINGS");
  console.log("=".repeat(60));

  // Approve marketplace for NFT transfers
  console.log("Approving marketplace for NFT transfers...");
  await nft.connect(deployer).setApprovalForAll(marketplaceAddress, true);
  await nft.connect(user1).setApprovalForAll(marketplaceAddress, true);
  await nftMulti.connect(deployer).setApprovalForAll(marketplaceAddress, true);

  // Create listings for some NFTs
  const listings = [
    { tokenId: 0, price: "0.5", name: "Cosmic Dreams #1" },
    { tokenId: 1, price: "1.0", name: "Digital Sunset #2" },
    { tokenId: 3, price: "2.5", name: "Neon City #4" },
  ];

  for (const listing of listings) {
    const priceWei = hre.ethers.parseEther(listing.price);
    const owner = listing.tokenId < 3 ? deployer : user1;

    const tx = await marketplace.connect(owner).listERC721(nftAddress, listing.tokenId, priceWei);
    await tx.wait();

    const listingId = await marketplace.totalListings() - 1n;
    console.log(`Listed: ${listing.name}`);
    console.log(`  Listing ID: ${listingId}`);
    console.log(`  Price: ${listing.price} ETH`);
    console.log("");
  }

  // List some ERC-1155 tokens
  const multiListing = { tokenId: 0, amount: 3, price: "0.1", name: "Limited Series #1 (3 editions)" };
  const priceWei = hre.ethers.parseEther(multiListing.price);

  await marketplace.connect(deployer).listERC1155(nftMultiAddress, multiListing.tokenId, multiListing.amount, priceWei);
  const listingId = await marketplace.totalListings() - 1n;
  console.log(`Listed: ${multiListing.name}`);
  console.log(`  Listing ID: ${listingId}`);
  console.log(`  Amount: ${multiListing.amount}`);
  console.log(`  Price: ${multiListing.price} ETH each`);
  console.log("");

  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`ERC-721 NFTs minted: ${sampleNFTs.length}`);
  console.log(`ERC-1155 token types created: ${multiEditionNFTs.length}`);
  console.log(`Marketplace listings created: ${listings.length + 1}`);
  console.log("");
  console.log("Accounts:");
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
