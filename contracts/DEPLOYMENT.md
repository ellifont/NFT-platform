# Smart Contract Deployment Guide

This guide explains the environment variables required for deploying contracts to test networks and mainnet.

## Environment Variables (`.env`)

### Network RPC URLs

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

**What it is:** The RPC (Remote Procedure Call) endpoint URL for connecting to the Sepolia testnet.

**How to get it:**
1. Create a free account at [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/)
2. Create a new project
3. Copy the Sepolia endpoint URL
4. Replace `YOUR_INFURA_KEY` with your actual API key

**Example:** `https://sepolia.infura.io/v3/abc123def456...`

---

### Deployment Private Key

```
PRIVATE_KEY=your_private_key_here
```

**What it is:** The private key of the wallet that will deploy the contracts. This wallet pays the gas fees and becomes the contract owner.

**How to get it:**
1. Open MetaMask
2. Click the three dots menu → "Account details"
3. Click "Show private key"
4. Enter your password and copy the key

**Security Warning:**
- NEVER commit real private keys to git
- NEVER use a wallet with mainnet funds for testing
- Create a dedicated deployment wallet with only test ETH
- Add `.env` to your `.gitignore`

**Getting Test ETH:**
- Sepolia: [sepoliafaucet.com](https://sepoliafaucet.com) or [Alchemy Sepolia Faucet](https://sepoliafaucet.com)

---

### Etherscan API Key

```
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**What it is:** API key for verifying your contracts on Etherscan. Verification makes your contract source code public and allows users to interact with it directly on Etherscan.

**How to get it:**
1. Create an account at [Etherscan](https://etherscan.io/register)
2. Go to [API Keys](https://etherscan.io/myapikey)
3. Click "Add" to create a new API key
4. Copy the key

**Why verify contracts:**
- Builds trust with users (they can read the code)
- Enables "Read Contract" and "Write Contract" tabs on Etherscan
- Required for professional projects

---

### Gas Reporter (Optional)

```
REPORT_GAS=false
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

**What it is:** Generates a gas usage report when running tests, showing estimated deployment and transaction costs in USD.

**How to enable:**
1. Set `REPORT_GAS=true`
2. Get a free API key from [CoinMarketCap](https://coinmarketcap.com/api/)
3. Add the key to `COINMARKETCAP_API_KEY`

**Sample output:**
```
·------------------------|---------------------------|-------------|-----------------------------·
|  Solc version: 0.8.20  ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
·························|···························|·············|······························
|  Methods               ·               Gas         ·             ·                             │
·············|···········|·············|·············|·············|··············|···············
|  Contract  ·  Method   ·  Min        ·  Max        ·  Avg        ·  # calls     ·  usd (avg)   │
·············|···········|·············|·············|·············|··············|···············
|  NFT       ·  mint     ·      94521  ·     111621  ·     103071  ·           4  ·       $2.15  │
·------------------------|-------------|-------------|-------------|--------------|---------------·
```

---

## Deployment Commands

### Local Development (Hardhat Network)
```bash
# Start local node
npx hardhat node

# Deploy to local (in another terminal)
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia Testnet
```bash
# Make sure .env is configured
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Mainnet (Production)
```bash
# Double-check everything before mainnet deployment!
npx hardhat run scripts/deploy.js --network mainnet

# Verify
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Checklist Before Testnet/Mainnet Deployment

- [ ] All tests passing (`npx hardhat test`)
- [ ] Gas costs reviewed (`REPORT_GAS=true`)
- [ ] Contract audited (for mainnet)
- [ ] `.env` configured with correct keys
- [ ] Deployment wallet has sufficient ETH for gas
- [ ] Constructor arguments documented
- [ ] Emergency pause mechanism tested
- [ ] Owner/admin addresses correct

---

## Network Configuration

Networks are configured in `hardhat.config.js`:

| Network   | Chain ID | Currency | Block Explorer              |
|-----------|----------|----------|------------------------------|
| localhost | 31337    | ETH      | N/A                          |
| sepolia   | 11155111 | SepoliaETH | https://sepolia.etherscan.io |
| mainnet   | 1        | ETH      | https://etherscan.io         |

---

## Troubleshooting

**"Insufficient funds"**: Your deployment wallet needs ETH for gas fees.

**"Nonce too high"**: Reset your MetaMask account (Settings → Advanced → Clear activity tab data).

**"Contract verification failed"**: Ensure compiler settings match exactly (version, optimizer runs).

**"Transaction underpriced"**: Gas prices spiked. Wait or increase `gasPrice` in hardhat.config.js.
