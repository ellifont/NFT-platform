"""Marketplace API routes"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    ListingCreateRequest, ListingResponse, ListingListResponse,
    BuyRequest, BuyResponse
)
from app.models import Listing, ListingStatus, NFT, User, TokenStandard
from app.services import web3_service
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("", response_model=ListingListResponse)
async def list_listings(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[ListingStatus] = ListingStatus.ACTIVE,
    seller: Optional[str] = None,
    token_standard: Optional[TokenStandard] = None,
    min_price: Optional[str] = None,
    max_price: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List marketplace listings with filters.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status_filter**: Filter by status (default: active)
    - **seller**: Filter by seller wallet address
    - **token_standard**: Filter by token standard (ERC721 or ERC1155)
    - **min_price**: Minimum price in ETH
    - **max_price**: Maximum price in ETH
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = db.query(Listing)

    # Apply status filter
    if status_filter:
        query = query.filter(Listing.status == status_filter)

    # Filter by seller
    if seller:
        seller_user = db.query(User).filter(User.wallet_address == seller.lower()).first()
        if seller_user:
            query = query.filter(Listing.seller_id == seller_user.id)
        else:
            query = query.filter(False)  # No results if seller not found

    # Filter by token standard (requires join with NFT)
    if token_standard:
        query = query.join(NFT).filter(NFT.token_standard == token_standard)

    # Price filters (ETH stored as string, convert to compare)
    if min_price:
        min_wei = str(web3_service.to_wei(float(min_price)))
        query = query.filter(Listing.price_eth >= min_wei)

    if max_price:
        max_wei = str(web3_service.to_wei(float(max_price)))
        query = query.filter(Listing.price_eth <= max_wei)

    # Get total count
    total = query.count()

    # Get paginated results
    listings = query.order_by(Listing.created_at.desc()).offset(offset).limit(page_size).all()

    return ListingListResponse(
        items=[ListingResponse.model_validate(listing) for listing in listings],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(listing_id: int, db: Session = Depends(get_db)):
    """
    Get listing details by ID.
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    return ListingResponse.model_validate(listing)


@router.post("/list", response_model=ListingResponse)
async def create_listing(
    request: ListingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new marketplace listing.

    The user must own the NFT to list it.
    Returns listing details with transaction data for the user to sign.
    """
    # Get the NFT
    nft = db.query(NFT).filter(NFT.id == request.nft_id).first()
    if not nft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFT not found"
        )

    # Verify ownership
    if nft.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't own this NFT"
        )

    # Check for ERC-1155 amount
    if nft.token_standard == TokenStandard.ERC1155:
        if request.amount < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be at least 1 for ERC-1155"
            )
    else:
        if request.amount != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be 1 for ERC-721"
            )

    # Check if NFT is already listed
    existing_listing = db.query(Listing).filter(
        Listing.nft_id == nft.id,
        Listing.status == ListingStatus.ACTIVE
    ).first()

    if existing_listing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NFT is already listed for sale"
        )

    # Convert price to Wei
    try:
        price_wei = web3_service.to_wei(float(request.price_eth))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid price format"
        )

    # Create listing in database
    listing = Listing(
        nft_id=nft.id,
        seller_id=current_user.id,
        price_eth=str(price_wei),
        amount=request.amount,
        status=ListingStatus.ACTIVE
    )

    db.add(listing)
    db.commit()
    db.refresh(listing)

    return ListingResponse.model_validate(listing)


@router.post("/buy", response_model=BuyResponse)
async def buy_listing(
    request: BuyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buy an NFT from a listing.

    Returns transaction data for the user to sign and execute.
    """
    listing = db.query(Listing).filter(Listing.id == request.listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Listing is not active (status: {listing.status.value})"
        )

    # Can't buy your own listing
    if listing.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot buy your own listing"
        )

    # Build buy transaction
    try:
        if listing.listing_id:
            # On-chain listing exists
            tx_data = web3_service.build_buy_tx(
                listing_id=listing.listing_id,
                price_wei=int(listing.price_eth),
                from_address=current_user.wallet_address
            )

            return BuyResponse(
                listing_id=listing.id,
                status="pending_signature",
                message="Sign the transaction to complete purchase",
                tx_hash=None
            )
        else:
            # Off-chain listing - needs to be listed on-chain first
            return BuyResponse(
                listing_id=listing.id,
                status="requires_on_chain_listing",
                message="This listing needs to be created on-chain first",
                tx_hash=None
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build buy transaction: {str(e)}"
        )


@router.post("/cancel/{listing_id}", response_model=ListingResponse)
async def cancel_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a listing.

    Only the seller can cancel their own listing.
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own listings"
        )

    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel listing with status: {listing.status.value}"
        )

    # Update listing status
    listing.status = ListingStatus.CANCELLED
    listing.cancelled_at = datetime.utcnow()

    db.commit()
    db.refresh(listing)

    return ListingResponse.model_validate(listing)


@router.post("/sync/{listing_id}")
async def sync_listing(
    listing_id: int,
    on_chain_listing_id: int,
    tx_hash: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync a listing with on-chain data after the list transaction is confirmed.

    - **listing_id**: Database listing ID
    - **on_chain_listing_id**: Listing ID from the smart contract
    - **tx_hash**: Transaction hash of the list transaction
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only sync your own listings"
        )

    # Update with on-chain data
    listing.listing_id = on_chain_listing_id
    listing.list_tx_hash = tx_hash

    db.commit()
    db.refresh(listing)

    return ListingResponse.model_validate(listing)


@router.post("/complete-sale/{listing_id}")
async def complete_sale(
    listing_id: int,
    tx_hash: str,
    buyer_address: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a listing as sold after the buy transaction is confirmed.

    This endpoint is called after the on-chain purchase is complete.
    """
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )

    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Listing is not active"
        )

    # Get or create buyer user
    buyer = db.query(User).filter(User.wallet_address == buyer_address.lower()).first()
    if not buyer:
        buyer = User(wallet_address=buyer_address.lower())
        db.add(buyer)
        db.flush()

    # Update listing
    listing.status = ListingStatus.SOLD
    listing.buyer_id = buyer.id
    listing.sale_tx_hash = tx_hash
    listing.sold_at = datetime.utcnow()

    # Update NFT ownership
    nft = listing.nft
    nft.owner_id = buyer.id

    db.commit()
    db.refresh(listing)

    return ListingResponse.model_validate(listing)
