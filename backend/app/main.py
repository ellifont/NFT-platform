"""NFT Marketplace FastAPI Application"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.app_name,
    description="Decentralized NFT Marketplace API - Mint, List, and Trade NFTs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Routers will be added here in Phase 5
# from app.routers import auth, nft, marketplace, mint_request
# app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# app.include_router(nft.router, prefix="/nft", tags=["NFT"])
# app.include_router(marketplace.router, prefix="/marketplace", tags=["Marketplace"])
# app.include_router(mint_request.router, prefix="/mint-request", tags=["Mint Requests"])
