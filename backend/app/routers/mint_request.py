"""Mint Request API routes - Artist mint request workflow"""

import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    MintRequestCreate, MintRequestUpdate, MintRequestReview,
    MintRequestResponse, MintRequestListResponse, NFTAttribute
)
from app.models import MintRequest, MintRequestStatus, User, NFT, TokenStandard
from app.models.mint_request import TokenStandardRequest
from app.services import ipfs_service, PinataError
from app.routers.auth import get_current_user, get_current_admin

router = APIRouter()


@router.post("", response_model=MintRequestResponse)
async def create_mint_request(
    request: MintRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a mint request for admin approval.

    Artists use this endpoint to request minting of their artwork.
    An admin will review and approve/reject the request.
    """
    # Serialize attributes if provided
    attributes_json = None
    if request.attributes:
        attributes_json = json.dumps([attr.model_dump() for attr in request.attributes])

    mint_request = MintRequest(
        artist_id=current_user.id,
        title=request.title,
        description=request.description,
        artwork_url=request.artwork_url,
        token_standard=request.token_standard,
        edition_size=request.edition_size,
        royalty_percentage=request.royalty_percentage,
        metadata_name=request.title,
        metadata_description=request.description,
        metadata_attributes=attributes_json,
        status=MintRequestStatus.PENDING
    )

    db.add(mint_request)
    db.commit()
    db.refresh(mint_request)

    return MintRequestResponse.model_validate(mint_request)


@router.get("", response_model=MintRequestListResponse)
async def list_my_mint_requests(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[MintRequestStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List the current user's mint requests.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status_filter**: Filter by status
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = db.query(MintRequest).filter(MintRequest.artist_id == current_user.id)

    if status_filter:
        query = query.filter(MintRequest.status == status_filter)

    total = query.count()
    mint_requests = query.order_by(MintRequest.created_at.desc()).offset(offset).limit(page_size).all()

    return MintRequestListResponse(
        items=[MintRequestResponse.model_validate(mr) for mr in mint_requests],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.get("/pending", response_model=MintRequestListResponse)
async def list_pending_requests(
    page: int = 1,
    page_size: int = 20,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all pending mint requests.

    Admin only endpoint.
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = db.query(MintRequest).filter(MintRequest.status == MintRequestStatus.PENDING)

    total = query.count()
    mint_requests = query.order_by(MintRequest.created_at.asc()).offset(offset).limit(page_size).all()

    return MintRequestListResponse(
        items=[MintRequestResponse.model_validate(mr) for mr in mint_requests],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.get("/all", response_model=MintRequestListResponse)
async def list_all_requests(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[MintRequestStatus] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    List all mint requests.

    Admin only endpoint.
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = db.query(MintRequest)

    if status_filter:
        query = query.filter(MintRequest.status == status_filter)

    total = query.count()
    mint_requests = query.order_by(MintRequest.created_at.desc()).offset(offset).limit(page_size).all()

    return MintRequestListResponse(
        items=[MintRequestResponse.model_validate(mr) for mr in mint_requests],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.get("/{request_id}", response_model=MintRequestResponse)
async def get_mint_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a mint request by ID.

    Artists can view their own requests. Admins can view all requests.
    """
    mint_request = db.query(MintRequest).filter(MintRequest.id == request_id).first()
    if not mint_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mint request not found"
        )

    # Check access: must be artist or admin
    if mint_request.artist_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this mint request"
        )

    return MintRequestResponse.model_validate(mint_request)


@router.put("/{request_id}", response_model=MintRequestResponse)
async def update_mint_request(
    request_id: int,
    request: MintRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a mint request.

    Only the artist can update their own pending request.
    """
    mint_request = db.query(MintRequest).filter(MintRequest.id == request_id).first()
    if not mint_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mint request not found"
        )

    if mint_request.artist_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this mint request"
        )

    if mint_request.status != MintRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending requests"
        )

    # Update fields
    if request.title is not None:
        mint_request.title = request.title
        mint_request.metadata_name = request.title

    if request.description is not None:
        mint_request.description = request.description
        mint_request.metadata_description = request.description

    if request.artwork_url is not None:
        mint_request.artwork_url = request.artwork_url

    if request.edition_size is not None:
        mint_request.edition_size = request.edition_size

    if request.royalty_percentage is not None:
        mint_request.royalty_percentage = request.royalty_percentage

    db.commit()
    db.refresh(mint_request)

    return MintRequestResponse.model_validate(mint_request)


@router.delete("/{request_id}")
async def delete_mint_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a mint request.

    Only the artist can delete their own pending request.
    """
    mint_request = db.query(MintRequest).filter(MintRequest.id == request_id).first()
    if not mint_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mint request not found"
        )

    if mint_request.artist_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this mint request"
        )

    if mint_request.status != MintRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete pending requests"
        )

    db.delete(mint_request)
    db.commit()

    return {"message": "Mint request deleted successfully"}


@router.post("/{request_id}/review", response_model=MintRequestResponse)
async def review_mint_request(
    request_id: int,
    review: MintRequestReview,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Review a mint request (approve or reject).

    Admin only endpoint.
    """
    mint_request = db.query(MintRequest).filter(MintRequest.id == request_id).first()
    if not mint_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mint request not found"
        )

    if mint_request.status != MintRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review request with status: {mint_request.status.value}"
        )

    if review.status not in [MintRequestStatus.APPROVED, MintRequestStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'approved' or 'rejected'"
        )

    mint_request.status = review.status
    mint_request.admin_notes = review.admin_notes
    mint_request.reviewed_by_id = current_admin.id
    mint_request.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(mint_request)

    return MintRequestResponse.model_validate(mint_request)


@router.post("/{request_id}/mint", response_model=MintRequestResponse)
async def mint_approved_request(
    request_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Mint an approved request.

    Admin only endpoint. This will:
    1. Upload artwork to IPFS
    2. Create metadata and upload to IPFS
    3. Return transaction data for minting

    The actual minting happens on-chain after signing.
    """
    mint_request = db.query(MintRequest).filter(MintRequest.id == request_id).first()
    if not mint_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mint request not found"
        )

    if mint_request.status != MintRequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only mint approved requests (current status: {mint_request.status.value})"
        )

    if not ipfs_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IPFS service not configured"
        )

    try:
        # Parse attributes if present
        attributes = None
        if mint_request.metadata_attributes:
            attributes = json.loads(mint_request.metadata_attributes)

        # Upload metadata to IPFS
        # Note: In production, you'd also upload the image if it's not already on IPFS
        metadata_result = await ipfs_service.upload_nft_metadata(
            name=mint_request.metadata_name or mint_request.title,
            description=mint_request.metadata_description or mint_request.description or "",
            image_ipfs_url=mint_request.artwork_url,  # Assuming already IPFS URL or will be handled
            attributes=attributes,
            creator=mint_request.artist.wallet_address
        )

        # Update request with IPFS URIs
        mint_request.metadata_ipfs_uri = metadata_result["ipfs_url"]

        db.commit()
        db.refresh(mint_request)

        return MintRequestResponse.model_validate(mint_request)

    except PinataError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to IPFS: {str(e)}"
        )


@router.post("/{request_id}/complete-mint")
async def complete_mint(
    request_id: int,
    tx_hash: str,
    token_id: int,
    contract_address: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Complete the minting process after the on-chain transaction is confirmed.

    Admin only endpoint. Called after the mint transaction is confirmed on-chain.
    """
    mint_request = db.query(MintRequest).filter(MintRequest.id == request_id).first()
    if not mint_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mint request not found"
        )

    if mint_request.status != MintRequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request must be in approved status"
        )

    # Convert token standard
    token_standard = TokenStandard.ERC721
    if mint_request.token_standard == TokenStandardRequest.ERC1155:
        token_standard = TokenStandard.ERC1155

    # Create NFT record
    nft = NFT(
        token_id=token_id,
        contract_address=contract_address.lower(),
        token_standard=token_standard,
        name=mint_request.title,
        description=mint_request.description,
        image_url=mint_request.artwork_url,
        metadata_uri=mint_request.metadata_ipfs_uri,
        owner_id=mint_request.artist_id,
        creator_id=mint_request.artist_id,
        edition_size=mint_request.edition_size if token_standard == TokenStandard.ERC1155 else 1,
        royalty_percentage=mint_request.royalty_percentage
    )

    db.add(nft)
    db.flush()

    # Update mint request
    mint_request.status = MintRequestStatus.MINTED
    mint_request.nft_id = nft.id
    mint_request.mint_tx_hash = tx_hash
    mint_request.minted_at = datetime.utcnow()

    db.commit()
    db.refresh(mint_request)

    return MintRequestResponse.model_validate(mint_request)
