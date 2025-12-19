const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Configuration
  const NFT_NAME = "ArtworkNFT";
  const NFT_SYMBOL = "ART";
  const MULTI_NAME = "ArtworkEditions";
  const MULTI_SYMBOL = "ARTE";
  const DEFAULT_ROYALTY_BPS = 500; // 5%

  // Deploy NFT (ERC-721)
  console.log("\n1. Deploying NFT (ERC-721)...");
  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = await NFT.deploy(NFT_NAME, NFT_SYMBOL, DEFAULT_ROYALTY_BPS);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("   NFT deployed to:", nftAddress);

  // Deploy NFTMultiEdition (ERC-1155)
  console.log("\n2. Deploying NFTMultiEdition (ERC-1155)...");
  const NFTMultiEdition = await hre.ethers.getContractFactory("NFTMultiEdition");
  const nftMulti = await NFTMultiEdition.deploy(MULTI_NAME, MULTI_SYMBOL, DEFAULT_ROYALTY_BPS);
  await nftMulti.waitForDeployment();
  const nftMultiAddress = await nftMulti.getAddress();
  console.log("   NFTMultiEdition deployed to:", nftMultiAddress);

  // Deploy Marketplace
  console.log("\n3. Deploying Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(deployer.address); // deployer is fee recipient
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("   Marketplace deployed to:", marketplaceAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:            ${hre.network.name}`);
  console.log(`Deployer:           ${deployer.address}`);
  console.log("-".repeat(60));
  console.log(`NFT (ERC-721):      ${nftAddress}`);
  console.log(`NFTMultiEdition:    ${nftMultiAddress}`);
  console.log(`Marketplace:        ${marketplaceAddress}`);
  console.log("-".repeat(60));
  console.log(`Default Royalty:    ${DEFAULT_ROYALTY_BPS / 100}%`);
  console.log(`Platform Fee:       2.5%`);
  console.log(`Fee Recipient:      ${deployer.address}`);
  console.log("=".repeat(60));

  // Output for .env file
  console.log("\n# Add these to your .env file:");
  console.log(`NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`NFT_MULTI_EDITION_ADDRESS=${nftMultiAddress}`);
  console.log(`MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);

  // Verify contracts on Etherscan (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await nft.deploymentTransaction().wait(5);
    await nftMulti.deploymentTransaction().wait(5);
    await marketplace.deploymentTransaction().wait(5);

    console.log("Verifying contracts on Etherscan...");

    try {
      await hre.run("verify:verify", {
        address: nftAddress,
        constructorArguments: [NFT_NAME, NFT_SYMBOL, DEFAULT_ROYALTY_BPS],
      });
    } catch (e) {
      console.log("NFT verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: nftMultiAddress,
        constructorArguments: [MULTI_NAME, MULTI_SYMBOL, DEFAULT_ROYALTY_BPS],
      });
    } catch (e) {
      console.log("NFTMultiEdition verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: marketplaceAddress,
        constructorArguments: [deployer.address],
      });
    } catch (e) {
      console.log("Marketplace verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
