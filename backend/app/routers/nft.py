"""NFT API routes"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.schemas import NFTResponse, NFTListResponse, NFTMintRequest
from app.models import NFT, User, TokenStandard
from app.services import ipfs_service, web3_service, PinataError
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("", response_model=NFTListResponse)
async def list_nfts(
    page: int = 1,
    page_size: int = 20,
    owner: Optional[str] = None,
    creator: Optional[str] = None,
    token_standard: Optional[TokenStandard] = None,
    db: Session = Depends(get_db)
):
    """
    List all NFTs with optional filters.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **owner**: Filter by owner wallet address
    - **creator**: Filter by creator wallet address
    - **token_standard**: Filter by token standard (ERC721 or ERC1155)
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    query = db.query(NFT).filter(NFT.is_burned == False)

    # Apply filters
    if owner:
        owner_user = db.query(User).filter(User.wallet_address == owner.lower()).first()
        if owner_user:
            query = query.filter(NFT.owner_id == owner_user.id)
        else:
            query = query.filter(False)  # No results if owner not found

    if creator:
        creator_user = db.query(User).filter(User.wallet_address == creator.lower()).first()
        if creator_user:
            query = query.filter(NFT.creator_id == creator_user.id)
        else:
            query = query.filter(False)

    if token_standard:
        query = query.filter(NFT.token_standard == token_standard)

    # Get total count
    total = query.count()

    # Get paginated results
    nfts = query.order_by(NFT.created_at.desc()).offset(offset).limit(page_size).all()

    return NFTListResponse(
        items=[NFTResponse.model_validate(nft) for nft in nfts],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.get("/{nft_id}", response_model=NFTResponse)
async def get_nft(nft_id: int, db: Session = Depends(get_db)):
    """
    Get NFT details by ID.
    """
    nft = db.query(NFT).filter(NFT.id == nft_id).first()
    if not nft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFT not found"
        )
    return NFTResponse.model_validate(nft)


@router.get("/token/{contract_address}/{token_id}", response_model=NFTResponse)
async def get_nft_by_token(
    contract_address: str,
    token_id: int,
    db: Session = Depends(get_db)
):
    """
    Get NFT details by contract address and token ID.
    """
    nft = db.query(NFT).filter(
        NFT.contract_address == contract_address.lower(),
        NFT.token_id == token_id
    ).first()

    if not nft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFT not found"
        )
    return NFTResponse.model_validate(nft)


@router.get("/user/{wallet_address}", response_model=NFTListResponse)
async def get_user_nfts(
    wallet_address: str,
    owned: bool = True,
    created: bool = False,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get NFTs owned or created by a user.

    - **wallet_address**: User's wallet address
    - **owned**: Include owned NFTs (default: true)
    - **created**: Include created NFTs (default: false)
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    user = db.query(User).filter(User.wallet_address == wallet_address.lower()).first()
    if not user:
        return NFTListResponse(items=[], total=0, page=page, page_size=page_size, pages=0)

    query = db.query(NFT).filter(NFT.is_burned == False)

    # Build filter conditions
    conditions = []
    if owned:
        conditions.append(NFT.owner_id == user.id)
    if created:
        conditions.append(NFT.creator_id == user.id)

    if conditions:
        query = query.filter(or_(*conditions))
    else:
        return NFTListResponse(items=[], total=0, page=page, page_size=page_size, pages=0)

    total = query.count()
    nfts = query.order_by(NFT.created_at.desc()).offset(offset).limit(page_size).all()

    return NFTListResponse(
        items=[NFTResponse.model_validate(nft) for nft in nfts],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size
    )


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image to IPFS.

    Returns the IPFS URL to use when minting an NFT.
    """
    if not ipfs_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IPFS service not configured"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size: 10MB"
        )

    try:
        # Reset file position
        await file.seek(0)

        result = await ipfs_service.upload_file(
            file=file.file,
            filename=file.filename,
            content_type=file.content_type,
            metadata_name=f"artwork_{current_user.id}_{file.filename}"
        )

        return {
            "ipfs_url": result["ipfs_url"],
            "gateway_url": result["gateway_url"],
            "ipfs_hash": result["ipfs_hash"]
        }
    except PinataError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to IPFS: {str(e)}"
        )


@router.post("/mint")
async def mint_nft(
    request: NFTMintRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mint a new NFT.

    This endpoint:
    1. Uploads metadata to IPFS
    2. Returns transaction data for the user to sign

    The actual minting happens on-chain after the user signs and broadcasts the transaction.
    """
    if not ipfs_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IPFS service not configured"
        )

    try:
        # Upload metadata to IPFS
        attributes = None
        if request.attributes:
            attributes = [attr.model_dump() for attr in request.attributes]

        metadata_result = await ipfs_service.upload_nft_metadata(
            name=request.name,
            description=request.description or "",
            image_ipfs_url=request.image_url,
            attributes=attributes,
            creator=current_user.wallet_address
        )

        # Build mint transaction (for user to sign)
        # Note: In production, you'd return the unsigned transaction
        # for the user to sign with their wallet

        return {
            "metadata_uri": metadata_result["ipfs_url"],
            "metadata_gateway_url": metadata_result["gateway_url"],
            "message": "Metadata uploaded. Sign the transaction to complete minting.",
            "token_standard": request.token_standard.value,
            "edition_size": request.edition_size
        }
    except PinataError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload metadata: {str(e)}"
        )


@router.post("/sync/{contract_address}/{token_id}")
async def sync_nft(
    contract_address: str,
    token_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync an NFT from the blockchain to the database.

    Use this after minting to register the NFT in the database.
    """
    # Check if NFT already exists
    existing = db.query(NFT).filter(
        NFT.contract_address == contract_address.lower(),
        NFT.token_id == token_id
    ).first()

    if existing:
        return NFTResponse.model_validate(existing)

    try:
        # Fetch data from blockchain
        owner = web3_service.get_nft_owner(token_id, contract_address)
        token_uri = web3_service.get_nft_token_uri(token_id, contract_address)
        creator = web3_service.get_nft_creator(token_id, contract_address)

        # Get or create owner user
        owner_user = db.query(User).filter(User.wallet_address == owner.lower()).first()
        if not owner_user:
            owner_user = User(wallet_address=owner.lower())
            db.add(owner_user)
            db.flush()

        # Get or create creator user
        creator_user = db.query(User).filter(User.wallet_address == creator.lower()).first()
        if not creator_user:
            creator_user = User(wallet_address=creator.lower())
            db.add(creator_user)
            db.flush()

        # Create NFT record
        nft = NFT(
            token_id=token_id,
            contract_address=contract_address.lower(),
            token_standard=TokenStandard.ERC721,
            metadata_uri=token_uri,
            owner_id=owner_user.id,
            creator_id=creator_user.id
        )

        # Try to fetch metadata from IPFS
        try:
            if token_uri.startswith("ipfs://"):
                metadata = await ipfs_service.fetch_metadata(
                    ipfs_service.get_ipfs_hash(token_uri)
                )
                nft.name = metadata.get("name")
                nft.description = metadata.get("description")
                nft.image_url = metadata.get("image")
        except Exception:
            pass  # Metadata fetch failed, continue without it

        db.add(nft)
        db.commit()
        db.refresh(nft)

        return NFTResponse.model_validate(nft)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to sync NFT: {str(e)}"
        )
