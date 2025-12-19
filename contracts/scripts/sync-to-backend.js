const hre = require("hardhat");
const axios = require("axios");

const API_URL = "http://127.0.0.1:8000";
const NFT_CONTRACT = "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82";

async function main() {
  const [deployer, user1] = await hre.ethers.getSigners();

  console.log("Syncing NFTs to backend...\n");

  // Login as deployer
  console.log("=".repeat(60));
  console.log("AUTHENTICATING USERS");
  console.log("=".repeat(60));

  async function loginUser(signer, name) {
    const wallet = await signer.getAddress();
    console.log(`\nLogging in ${name}: ${wallet}`);

    // Get nonce
    const nonceRes = await axios.post(`${API_URL}/auth/nonce`, {
      wallet_address: wallet
    });
    const message = nonceRes.data.message;

    // Sign the message
    const signature = await signer.signMessage(message);

    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      wallet_address: wallet,
      signature: signature
    });

    console.log(`  Logged in as user ID: ${loginRes.data.user.id}`);
    return loginRes.data.access_token;
  }

  const deployerToken = await loginUser(deployer, "Deployer");
  const user1Token = await loginUser(user1, "User1");

  // Sync NFTs
  console.log("\n");
  console.log("=".repeat(60));
  console.log("SYNCING NFTs TO DATABASE");
  console.log("=".repeat(60));

  const NFT = await hre.ethers.getContractFactory("NFT");
  const nft = NFT.attach(NFT_CONTRACT);
  const totalSupply = await nft.totalSupply();

  console.log(`\nTotal NFTs to sync: ${totalSupply}\n`);

  for (let i = 0; i < totalSupply; i++) {
    try {
      const owner = await nft.ownerOf(i);
      const token = owner.toLowerCase() === (await deployer.getAddress()).toLowerCase()
        ? deployerToken
        : user1Token;

      const res = await axios.post(
        `${API_URL}/nft/sync/${NFT_CONTRACT}/${i}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log(`Synced Token #${i}:`);
      console.log(`  Name: ${res.data.name || 'Unnamed'}`);
      console.log(`  Owner: ${res.data.owner?.wallet_address || 'Unknown'}`);
    } catch (e) {
      if (e.response?.status === 200 || e.response?.data?.id) {
        console.log(`Token #${i} already synced`);
      } else {
        console.log(`Error syncing token #${i}: ${e.response?.data?.detail || e.message}`);
      }
    }
  }

  // Fetch and display NFTs
  console.log("\n");
  console.log("=".repeat(60));
  console.log("FETCHING NFTs FROM API");
  console.log("=".repeat(60));

  const nftsRes = await axios.get(`${API_URL}/nft`);
  console.log(`\nTotal NFTs in database: ${nftsRes.data.total}\n`);

  for (const nftItem of nftsRes.data.items) {
    console.log(`NFT #${nftItem.id}: ${nftItem.name || 'Unnamed'}`);
    console.log(`  Token ID: ${nftItem.token_id}`);
    console.log(`  Standard: ${nftItem.token_standard}`);
    console.log(`  Owner: ${nftItem.owner?.wallet_address || 'Unknown'}`);
    console.log("");
  }

  // Fetch listings
  console.log("=".repeat(60));
  console.log("MARKETPLACE LISTINGS");
  console.log("=".repeat(60));

  const listingsRes = await axios.get(`${API_URL}/marketplace`);
  console.log(`\nTotal listings: ${listingsRes.data.total}\n`);

  if (listingsRes.data.items.length === 0) {
    console.log("No listings yet. Creating some...\n");

    // Create listings for synced NFTs
    const nfts = nftsRes.data.items;
    const prices = ["0.5", "1.0", "2.5"];

    for (let i = 0; i < Math.min(3, nfts.length); i++) {
      const nftItem = nfts[i];
      const token = nftItem.owner?.wallet_address?.toLowerCase() === (await deployer.getAddress()).toLowerCase()
        ? deployerToken
        : user1Token;

      try {
        const listRes = await axios.post(
          `${API_URL}/marketplace/list`,
          {
            nft_id: nftItem.id,
            price_eth: prices[i]
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log(`Listed NFT #${nftItem.id} for ${prices[i]} ETH`);
        console.log(`  Listing ID: ${listRes.data.id}`);
      } catch (e) {
        console.log(`Could not list NFT #${nftItem.id}: ${e.response?.data?.detail || e.message}`);
      }
    }
  }

  // Final summary
  console.log("\n");
  console.log("=".repeat(60));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(60));

  const finalNfts = await axios.get(`${API_URL}/nft`);
  const finalListings = await axios.get(`${API_URL}/marketplace`);

  console.log(`\nNFTs in database: ${finalNfts.data.total}`);
  console.log(`Active listings: ${finalListings.data.total}`);
  console.log("\nFrontend URL: http://localhost:3000");
  console.log("API Docs: http://127.0.0.1:8000/docs");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
