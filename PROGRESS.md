# NFT Marketplace - Progress Tracker

## Quick Resume Guide
When continuing development, check the current phase status below and proceed from there.

---

## System Requirements

**IMPORTANT: Ensure you have these versions installed before proceeding:**

| Tool | Minimum Version | Recommended | Install Command |
|------|----------------|-------------|-----------------|
| Node.js | 18.17.0+ | 20.x LTS | `nvm install 20` or `brew install node@20` |
| Python | 3.9+ | 3.11+ | `pyenv install 3.11` or `brew install python@3.11` |
| npm | 9+ | 10+ | Comes with Node.js |

### Install Node.js 20 (Recommended)
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 20
nvm use 20

# Or using Homebrew
brew install node@20
```

### Install Python 3.11 (Recommended)
```bash
# Using pyenv (recommended)
brew install pyenv
pyenv install 3.11
pyenv global 3.11

# Or using Homebrew directly
brew install python@3.11
```

---

## Architecture Overview

```
NFT-platform/
├── contracts/                 # Solidity smart contracts (Hardhat)
│   ├── src/
│   │   ├── NFT.sol           # ERC-721 single edition NFT
│   │   ├── NFTMultiEdition.sol # ERC-1155 multi-edition NFT
│   │   └── Marketplace.sol   # Marketplace contract
│   ├── test/                 # Contract tests
│   ├── scripts/              # Deploy scripts
│   └── hardhat.config.js
│
├── backend/                   # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # SQLite connection
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routers/          # API routes
│   │   └── services/         # Web3, IPFS, Auth services
│   └── tests/                # Pytest tests
│
├── frontend/                  # Next.js + React frontend
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks (useWeb3, etc.)
│   │   └── lib/              # ethers.js, API client
│   └── public/               # Static assets
│
└── PROGRESS.md               # This file
```

## Tech Stack
- **Smart Contracts**: Solidity 0.8.20, Hardhat, OpenZeppelin 5.x
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Web3.py
- **Frontend**: Next.js 14, React 18, TypeScript, ethers.js v6, TailwindCSS
- **Database**: SQLite
- **Storage**: IPFS via Pinata
- **Local Blockchain**: Hardhat Network

---

## Phase Progress

### Phase 1: Project Setup & Foundation
**Status: ✅ COMPLETED**

| Task | Status |
|------|--------|
| Create directory structure | ✅ Done |
| Initialize contracts project (Hardhat) | ✅ Done |
| Initialize backend project (FastAPI) | ✅ Done |
| Initialize frontend project (Next.js) | ✅ Done |
| Create .gitignore | ✅ Done |
| Create .env.example files | ✅ Done |
| Create Python 3.12 virtual environment | ✅ Done |

**Verification Checkpoint 1:**
- [x] Python virtual environment created at `.venv/` with Python 3.12
- [x] Backend dependencies installed: `pip install -r backend/requirements.txt`
- [x] FastAPI app loads correctly: `cd backend && python -c "from app.main import app"`
- [ ] **BLOCKED**: Node.js 18+ required for contracts and frontend

**Action Required:**
```bash
# Install Node.js 18+ before proceeding to Phase 2
# Using nvm (recommended):
nvm install 20 && nvm use 20

# Or using Homebrew:
brew install node@20
```

---

### Phase 2: Smart Contracts Development
**Status: ⏳ NOT STARTED**

| Task | Status |
|------|--------|
| ERC-721 NFT Contract (NFT.sol) | ⏳ Pending |
| ERC-1155 NFT Contract (NFTMultiEdition.sol) | ⏳ Pending |
| Marketplace Contract | ⏳ Pending |
| Contract Tests | ⏳ Pending |

**Key Files:**
- `contracts/src/NFT.sol`
- `contracts/src/NFTMultiEdition.sol`
- `contracts/src/Marketplace.sol`
- `contracts/test/*.test.js`

---

### Phase 3: Database Layer
**Status: ⏳ NOT STARTED**

| Task | Status |
|------|--------|
| User model | ⏳ Pending |
| NFT model | ⏳ Pending |
| Listing model | ⏳ Pending |
| MintRequest model | ⏳ Pending |
| Transaction model | ⏳ Pending |
| Alembic migrations | ⏳ Pending |

**Key Files:**
- `backend/app/models/user.py`
- `backend/app/models/nft.py`
- `backend/app/models/listing.py`
- `backend/app/models/mint_request.py`

---

### Phase 4: Core Backend Services
**Status: ⏳ NOT STARTED**

| Task | Status |
|------|--------|
| Web3 Service | ⏳ Pending |
| IPFS Service (Pinata) | ⏳ Pending |
| Auth Service (Wallet-based) | ⏳ Pending |

**Key Files:**
- `backend/app/services/web3_service.py`
- `backend/app/services/ipfs_service.py`
- `backend/app/services/auth_service.py`

---

### Phase 5: API Routes
**Status: ⏳ NOT STARTED**

| Route | Status |
|-------|--------|
| POST /auth/nonce | ⏳ Pending |
| POST /auth/login | ⏳ Pending |
| GET /auth/me | ⏳ Pending |
| POST /nft/mint | ⏳ Pending |
| GET /nft/{id} | ⏳ Pending |
| POST /marketplace/list | ⏳ Pending |
| POST /marketplace/buy | ⏳ Pending |
| POST /mint-request | ⏳ Pending |
| POST /mint-request/{id}/approve | ⏳ Pending |

---

### Phase 6: Integration Testing
**Status: ⏳ NOT STARTED**

| Test | Status |
|------|--------|
| User mints own NFT | ⏳ Pending |
| User lists NFT for sale | ⏳ Pending |
| Buyer purchases NFT | ⏳ Pending |
| Mint request workflow | ⏳ Pending |

---

### Phase 7: Documentation & Deployment
**Status: ⏳ NOT STARTED**

| Task | Status |
|------|--------|
| README.md | ⏳ Pending |
| API documentation | ⏳ Pending |
| Deployment scripts | ⏳ Pending |
| Security notes | ⏳ Pending |

---

### Phase 8: Frontend
**Status: ⏳ NOT STARTED**

| Page/Component | Status |
|----------------|--------|
| Wallet connection hook | ⏳ Pending |
| Home page | ⏳ Pending |
| Browse/Explore page | ⏳ Pending |
| NFT Detail page | ⏳ Pending |
| Create/Mint page | ⏳ Pending |
| User Profile page | ⏳ Pending |

---

## Core User Flows

### A. Mint My Own Artwork
1. Upload artwork → IPFS (Pinata)
2. Create metadata JSON → IPFS
3. Call `mint()` on NFT contract
4. Store NFT record in database
5. Emit `Minted` event

### B. Request NFT Minting (For Artists)
1. Artist submits artwork + info via API
2. Admin reviews in pending queue
3. Admin approves → mint on artist's behalf
4. Ownership assigned to artist

### C. List NFT for Sale
1. Owner approves marketplace contract
2. Call `list()` with price
3. NFT held in escrow (or approved for transfer)
4. Emit `Listed` event

### D. Buy NFT
1. Buyer calls `buy()` with ETH
2. Contract distributes:
   - Creator royalty (EIP-2981)
   - Platform fee (2.5%)
   - Remainder to seller
3. NFT transferred to buyer
4. Emit `Sold` event

---

## Security Checklist

### Smart Contracts
- [ ] ReentrancyGuard on all external calls
- [ ] AccessControl for minting permissions
- [ ] Pausable for emergencies
- [ ] EIP-2981 royalty enforcement
- [ ] No overflow (Solidity 0.8+)

### Backend
- [ ] Signature verification for auth
- [ ] Rate limiting on API
- [ ] Input validation
- [ ] No private keys in code

### General
- [ ] Environment variables for secrets
- [ ] HTTPS in production
- [ ] Audit before mainnet

---

## Commands Reference

### Contracts
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat node  # Start local blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Last Updated
- **Date**: Phase 1 Completed
- **Next Step**: Run verification checkpoint 1, then proceed to Phase 2 (Smart Contracts)
