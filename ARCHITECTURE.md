# NFT Marketplace Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NFT MARKETPLACE PLATFORM                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────────┐
│                  │     │                  │     │                              │
│   Frontend       │────▶│   Backend API    │────▶│   Blockchain (Ethereum)     │
│   (Next.js)      │◀────│   (FastAPI)      │◀────│   (Hardhat/Mainnet)         │
│                  │     │                  │     │                              │
│   Port: 3000     │     │   Port: 8000     │     │   Port: 8545 (local)        │
│                  │     │                  │     │                              │
└────────┬─────────┘     └────────┬─────────┘     └──────────────────────────────┘
         │                        │                              │
         │                        │                              │
         ▼                        ▼                              │
┌──────────────────┐     ┌──────────────────┐                    │
│                  │     │                  │                    │
│   MetaMask       │     │   SQLite DB      │                    │
│   Wallet         │     │   (nft.db)       │                    │
│                  │     │                  │                    │
└──────────────────┘     └────────┬─────────┘                    │
                                  │                              │
                                  ▼                              │
                         ┌──────────────────┐                    │
                         │                  │                    │
                         │   Pinata IPFS    │◀───────────────────┘
                         │   (Storage)      │
                         │                  │
                         └──────────────────┘
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                       │
│                              (Next.js + React)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Pages     │  │ Components  │  │   Hooks     │  │    Lib      │            │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤            │
│  │ /           │  │ Navbar      │  │ useWeb3     │  │ api.ts      │            │
│  │ /explore    │  │ NFTCard     │  │ useAuth     │  │ contracts.ts│            │
│  │ /nft/[id]   │  │ WalletBtn   │  │ useNFT      │  │ utils.ts    │            │
│  │ /create     │  │ ListingCard │  │             │  │             │            │
│  │ /profile    │  │ Providers   │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                  │
│  State Management: Zustand          Styling: TailwindCSS                        │
│  Web3: ethers.js v6                 HTTP: Axios                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ REST API + JWT Auth
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND                                        │
│                              (Python FastAPI)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Routers    │  │  Services   │  │   Models    │  │   Schemas   │            │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤            │
│  │ /auth       │  │ auth_svc    │  │ User        │  │ UserSchema  │            │
│  │ /nft        │  │ web3_svc    │  │ NFT         │  │ NFTSchema   │            │
│  │ /marketplace│  │ ipfs_svc    │  │ Listing     │  │ ListingSchema│           │
│  │ /mint-req   │  │ nft_svc     │  │ MintRequest │  │ TxSchema    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                  │
│  ORM: SQLAlchemy                    Auth: JWT + Wallet Signatures               │
│  Async: uvicorn                     Validation: Pydantic                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Web3.py / Contract ABIs
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               SMART CONTRACTS                                    │
│                              (Solidity + Hardhat)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐           │
│  │   NFT.sol         │  │ NFTMultiEdition   │  │  Marketplace.sol  │           │
│  │   (ERC-721)       │  │    (ERC-1155)     │  │                   │           │
│  ├───────────────────┤  ├───────────────────┤  ├───────────────────┤           │
│  │ • mint()          │  │ • createAndMint() │  │ • listERC721()    │           │
│  │ • burn()          │  │ • mint()          │  │ • listERC1155()   │           │
│  │ • tokenURI()      │  │ • burn()          │  │ • buy()           │           │
│  │ • royaltyInfo()   │  │ • uri()           │  │ • cancelListing() │           │
│  │                   │  │ • royaltyInfo()   │  │ • updatePrice()   │           │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘           │
│                                                                                  │
│  Standards: ERC-721, ERC-1155, ERC-2981 (Royalties)                             │
│  Security: OpenZeppelin, ReentrancyGuard, Pausable                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow (Wallet-Based)

```
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│  User    │          │ Frontend │          │ Backend  │          │ Database │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │                     │
     │  1. Click Connect   │                     │                     │
     │────────────────────▶│                     │                     │
     │                     │                     │                     │
     │  2. MetaMask Popup  │                     │                     │
     │◀────────────────────│                     │                     │
     │                     │                     │                     │
     │  3. Approve         │                     │                     │
     │────────────────────▶│                     │                     │
     │                     │                     │                     │
     │                     │  4. POST /auth/nonce│                     │
     │                     │  {wallet_address}   │                     │
     │                     │────────────────────▶│                     │
     │                     │                     │                     │
     │                     │                     │  5. Create/Get User │
     │                     │                     │────────────────────▶│
     │                     │                     │                     │
     │                     │                     │  6. Generate Nonce  │
     │                     │                     │◀────────────────────│
     │                     │                     │                     │
     │                     │  7. Return {nonce,  │                     │
     │                     │     message}        │                     │
     │                     │◀────────────────────│                     │
     │                     │                     │                     │
     │  8. Sign Message    │                     │                     │
     │  (MetaMask)         │                     │                     │
     │◀────────────────────│                     │                     │
     │                     │                     │                     │
     │  9. Signature       │                     │                     │
     │────────────────────▶│                     │                     │
     │                     │                     │                     │
     │                     │  10. POST /auth/login                     │
     │                     │  {wallet, signature}│                     │
     │                     │────────────────────▶│                     │
     │                     │                     │                     │
     │                     │                     │  11. Verify Sig     │
     │                     │                     │  (ecrecover)        │
     │                     │                     │                     │
     │                     │                     │  12. Update Nonce   │
     │                     │                     │────────────────────▶│
     │                     │                     │                     │
     │                     │  13. Return JWT     │                     │
     │                     │  {access_token}     │                     │
     │                     │◀────────────────────│                     │
     │                     │                     │                     │
     │  14. Logged In!     │                     │                     │
     │◀────────────────────│                     │                     │
     │                     │                     │                     │
```

---

## NFT Minting Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Artist  │     │ Frontend │     │ Backend  │     │  Pinata  │     │Blockchain│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Upload      │                │                │                │
     │    Artwork     │                │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │                │ 2. POST /ipfs/upload            │                │
     │                │    (image file)│                │                │
     │                │───────────────▶│                │                │
     │                │                │                │                │
     │                │                │ 3. Pin Image   │                │
     │                │                │───────────────▶│                │
     │                │                │                │                │
     │                │                │ 4. Return CID  │                │
     │                │                │◀───────────────│                │
     │                │                │                │                │
     │                │ 5. Return      │                │                │
     │                │    image_uri   │                │                │
     │                │◀───────────────│                │                │
     │                │                │                │                │
     │ 6. Fill Form   │                │                │                │
     │   (name, desc) │                │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │                │ 7. POST /ipfs/metadata          │                │
     │                │   {name, desc, │                │                │
     │                │    image_uri}  │                │                │
     │                │───────────────▶│                │                │
     │                │                │                │                │
     │                │                │ 8. Pin JSON    │                │
     │                │                │───────────────▶│                │
     │                │                │                │                │
     │                │                │ 9. Return CID  │                │
     │                │                │◀───────────────│                │
     │                │                │                │                │
     │                │ 10. Return     │                │                │
     │                │     token_uri  │                │                │
     │                │◀───────────────│                │                │
     │                │                │                │                │
     │                │ 11. Call NFT.mint()             │                │
     │                │     (via MetaMask)              │                │
     │                │────────────────────────────────────────────────▶│
     │                │                │                │                │
     │ 12. Confirm TX │                │                │                │
     │◀───────────────│                │                │                │
     │                │                │                │                │
     │ 13. Approve    │                │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │                │                │                │ 14. TX Mined   │
     │                │                │                │    Event       │
     │                │◀────────────────────────────────────────────────│
     │                │                │                │                │
     │                │ 15. POST /nft/sync              │                │
     │                │    (sync to DB)│                │                │
     │                │───────────────▶│                │                │
     │                │                │                │                │
     │ 16. Success!   │                │                │                │
     │◀───────────────│                │                │                │
```

---

## Marketplace Buy Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌─────────────────────────────┐
│  Buyer   │     │ Frontend │     │ Backend  │     │      Blockchain             │
└────┬─────┘     └────┬─────┘     └────┬─────┘     │  ┌────────┐  ┌───────────┐  │
     │                │                │           │  │  NFT   │  │Marketplace│  │
     │                │                │           │  │Contract│  │ Contract  │  │
     │                │                │           │  └────────┘  └───────────┘  │
     │ 1. Browse      │                │           └─────────────────────────────┘
     │    Listings    │                │                │              │
     │───────────────▶│                │                │              │
     │                │                │                │              │
     │                │ 2. GET /marketplace             │              │
     │                │───────────────▶│                │              │
     │                │                │                │              │
     │                │ 3. Return      │                │              │
     │                │    listings    │                │              │
     │                │◀───────────────│                │              │
     │                │                │                │              │
     │ 4. Click Buy   │                │                │              │
     │───────────────▶│                │                │              │
     │                │                │                │              │
     │                │ 5. Call Marketplace.buy()       │              │
     │                │   {listingId, value: price}     │              │
     │                │─────────────────────────────────────────────▶  │
     │                │                │                │              │
     │ 6. Confirm TX  │                │                │              │
     │   (MetaMask)   │                │                │              │
     │◀───────────────│                │                │              │
     │                │                │                │              │
     │ 7. Approve     │                │                │              │
     │───────────────▶│                │                │              │
     │                │                │                │              │
     │                │                │                │  8. Transfer │
     │                │                │                │     NFT      │
     │                │                │                │◀─────────────│
     │                │                │                │              │
     │                │                │                │  9. Transfer │
     │                │                │                │     ETH      │
     │                │                │                │   (seller +  │
     │                │                │                │    royalty + │
     │                │                │                │    platform) │
     │                │                │                │              │
     │                │ 10. TX Confirmed               │              │
     │                │    (Sold Event)                │              │
     │                │◀────────────────────────────────────────────── │
     │                │                │                │              │
     │                │ 11. PUT /marketplace/sold       │              │
     │                │    (update DB) │                │              │
     │                │───────────────▶│                │              │
     │                │                │                │              │
     │ 12. Success!   │                │                │              │
     │    NFT Owned   │                │                │              │
     │◀───────────────│                │                │              │
```

---

## Payment Distribution

```
                              Total Payment (e.g., 1 ETH)
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │         Marketplace Contract          │
                    │                                       │
                    │   Listing Price: 1 ETH               │
                    │   Platform Fee:  2.5%                │
                    │   Creator Royalty: 5% (EIP-2981)     │
                    └───────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
           ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
           │   Seller    │     │  Platform   │     │   Creator   │
           │             │     │   (Owner)   │     │  (Original) │
           │  0.925 ETH  │     │  0.025 ETH  │     │  0.05 ETH   │
           │   (92.5%)   │     │   (2.5%)    │     │   (5%)      │
           └─────────────┘     └─────────────┘     └─────────────┘

    Note: If seller IS the creator, they receive both seller + royalty amounts
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA (SQLite)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │      nfts       │       │    listings     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ wallet_address  │  │    │ token_id        │  │    │ nft_id (FK)     │───┐
│ username        │  │    │ contract_address│  │    │ seller_id (FK)  │   │
│ bio             │  │    │ token_standard  │  │    │ price_eth       │   │
│ profile_image   │  │    │ name            │  │    │ status          │   │
│ is_artist       │  │    │ description     │  │    │ created_at      │   │
│ is_admin        │  │    │ image_url       │  │    │ sold_at         │   │
│ is_verified     │  │    │ metadata_uri    │  │    │ tx_hash         │   │
│ nonce           │  │    │ owner_id (FK)   │───┘   └─────────────────┘   │
│ created_at      │  │    │ creator_id (FK) │───┘                         │
│ last_login      │  └───▶│ created_at      │◀────────────────────────────┘
└─────────────────┘       └─────────────────┘
         │                        │
         │                        │
         ▼                        │
┌─────────────────┐       ┌───────┴─────────┐
│  mint_requests  │       │  transactions   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ artist_id (FK)  │───┐   │ tx_hash         │
│ name            │   │   │ type            │
│ description     │   │   │ from_address    │
│ image_url       │   │   │ to_address      │
│ status          │   │   │ nft_id (FK)     │
│ admin_notes     │   │   │ listing_id (FK) │
│ nft_id (FK)     │───┼──▶│ value_eth       │
│ created_at      │   │   │ gas_used        │
│ reviewed_at     │   │   │ block_number    │
└─────────────────┘   │   │ timestamp       │
                      │   └─────────────────┘
                      │
                      └──── References users table
```

---

## API Endpoints Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API ENDPOINTS                                       │
│                           http://127.0.0.1:8000                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Authentication
├── POST /auth/nonce          Get nonce for wallet signing
├── POST /auth/login          Verify signature, get JWT
└── GET  /auth/me             Get current user profile

NFTs
├── GET  /nft                 List all NFTs (paginated)
├── GET  /nft/{id}            Get NFT details
├── POST /nft/mint            Mint new NFT
├── POST /nft/sync/{addr}/{id} Sync on-chain NFT to database
└── GET  /nft/user/{address}  Get NFTs by owner

Marketplace
├── GET  /marketplace         List active listings
├── GET  /marketplace/{id}    Get listing details
├── POST /marketplace/list    Create new listing
├── POST /marketplace/buy     Record purchase
└── DELETE /marketplace/{id}  Cancel listing

Mint Requests (Admin)
├── GET  /mint-request        List pending requests
├── POST /mint-request        Submit mint request
├── POST /mint-request/{id}/approve   Approve request
└── POST /mint-request/{id}/reject    Reject request

IPFS
├── POST /ipfs/upload         Upload file to Pinata
└── POST /ipfs/metadata       Upload metadata JSON
```

---

## Smart Contract Interfaces

```solidity
// NFT.sol (ERC-721)
interface INFT {
    function mint(address to, string memory tokenURI) external returns (uint256);
    function burn(uint256 tokenId) external;
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external;
    function totalSupply() external view returns (uint256);
}

// NFTMultiEdition.sol (ERC-1155)
interface INFTMultiEdition {
    function createAndMint(
        address to,
        string memory tokenURI,
        uint256 maxSupply,
        uint256 amount
    ) external returns (uint256);
    function mint(address to, uint256 tokenTypeId, uint256 amount) external;
    function burn(address from, uint256 tokenTypeId, uint256 amount) external;
}

// Marketplace.sol
interface IMarketplace {
    function listERC721(address nftContract, uint256 tokenId, uint256 price) external;
    function listERC1155(address nftContract, uint256 tokenId, uint256 amount, uint256 pricePerToken) external;
    function buy(uint256 listingId) external payable;
    function cancelListing(uint256 listingId) external;
    function updateListingPrice(uint256 listingId, uint256 newPrice) external;
}
```

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            TECHNOLOGY STACK                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  FRONTEND                          BACKEND                                       │
│  ─────────                         ───────                                       │
│  • Next.js 14 (App Router)         • Python 3.11+                               │
│  • React 18                        • FastAPI                                     │
│  • TypeScript                      • SQLAlchemy (ORM)                           │
│  • TailwindCSS                     • Pydantic (Validation)                      │
│  • ethers.js v6                    • Web3.py                                    │
│  • Zustand (State)                 • python-jose (JWT)                          │
│  • Axios (HTTP)                    • uvicorn (ASGI)                             │
│                                                                                  │
│  BLOCKCHAIN                        STORAGE                                       │
│  ──────────                        ───────                                       │
│  • Solidity 0.8.20                 • SQLite (Database)                          │
│  • Hardhat                         • Pinata (IPFS)                              │
│  • OpenZeppelin Contracts                                                        │
│  • ERC-721, ERC-1155, ERC-2981                                                  │
│                                                                                  │
│  DEVELOPMENT                       TESTING                                       │
│  ───────────                       ───────                                       │
│  • VS Code                         • Hardhat Tests                              │
│  • MetaMask                        • Pytest                                      │
│  • Hardhat Network                 • Jest (Frontend)                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture (Production)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION DEPLOYMENT                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────────┐
                              │   Cloudflare  │
                              │   (CDN/DNS)   │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
           ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
           │   Vercel    │   │   Railway   │   │   Ethereum  │
           │  (Frontend) │   │  (Backend)  │   │  (Mainnet)  │
           │             │   │             │   │             │
           │  Next.js    │   │  FastAPI    │   │  Contracts  │
           │  Static +   │   │  + SQLite   │   │             │
           │  SSR        │   │  or Postgres│   │             │
           └─────────────┘   └──────┬──────┘   └─────────────┘
                                    │
                                    ▼
                            ┌─────────────┐
                            │   Pinata    │
                            │   (IPFS)    │
                            │             │
                            │  NFT Media  │
                            │  Metadata   │
                            └─────────────┘

Alternative Deployment Options:
• Frontend: Vercel, Netlify, AWS Amplify
• Backend: Railway, Render, AWS Lambda, DigitalOcean
• Database: PostgreSQL (Supabase, Neon), PlanetScale
• Blockchain: Ethereum Mainnet, Polygon, Base, Arbitrum
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY MEASURES                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

FRONTEND SECURITY
├── No private keys stored
├── All transactions signed in MetaMask
├── JWT tokens in memory (not localStorage)
└── Input validation before API calls

BACKEND SECURITY
├── Signature verification for auth
├── JWT with expiration
├── Rate limiting
├── Input validation (Pydantic)
├── SQL injection protection (ORM)
└── CORS configuration

SMART CONTRACT SECURITY
├── OpenZeppelin battle-tested contracts
├── ReentrancyGuard on all external calls
├── AccessControl for privileged functions
├── Pausable for emergencies
├── SafeMath (built into Solidity 0.8+)
├── Pull payment pattern
└── Checks-Effects-Interactions pattern

INFRASTRUCTURE SECURITY
├── HTTPS everywhere
├── Environment variables for secrets
├── .env files in .gitignore
└── Separate wallets for deploy vs admin
```

---

## Quick Reference: Contract Addresses

```
LOCAL DEVELOPMENT (Hardhat Network - Chain ID: 31337)
─────────────────────────────────────────────────────
NFT (ERC-721):      0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82
NFTMultiEdition:    0x9A676e781A523b5d0C0e43731313A708CB607508
Marketplace:        0x0B306BF915C4d645ff596e518fAf3F9669b97016

SEPOLIA TESTNET (Chain ID: 11155111)
────────────────────────────────────
NFT (ERC-721):      [Deploy with: npx hardhat run scripts/deploy.js --network sepolia]
NFTMultiEdition:    [Not yet deployed]
Marketplace:        [Not yet deployed]
```
