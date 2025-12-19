"""Authentication API routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import NonceRequest, NonceResponse, LoginRequest, LoginResponse, UserResponse
from app.services import auth_service, AuthError
from app.models import User

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        return auth_service.get_current_user(db, token)
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to require admin user"""
    try:
        auth_service.require_admin(current_user)
        return current_user
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/nonce", response_model=NonceResponse)
async def get_nonce(request: NonceRequest, db: Session = Depends(get_db)):
    """
    Get a nonce for wallet authentication.

    This is the first step in the authentication flow.
    The returned message should be signed by the user's wallet.
    """
    try:
        nonce = auth_service.generate_nonce_for_user(db, request.wallet_address)
        message = auth_service.get_sign_message(request.wallet_address, nonce)

        return NonceResponse(
            nonce=nonce,
            message=message
        )
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with wallet signature.

    After signing the message from /nonce endpoint, submit the signature here
    to receive a JWT access token.
    """
    try:
        result = auth_service.verify_signature_and_login(
            db,
            request.wallet_address,
            request.signature
        )

        return LoginResponse(
            access_token=result["access_token"],
            token_type=result["token_type"],
            user=UserResponse.model_validate(result["user"])
        )
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    username: str = None,
    bio: str = None,
    profile_image_url: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile.
    """
    if username is not None:
        # Check if username is already taken
        existing = db.query(User).filter(
            User.username == username,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        current_user.username = username

    if bio is not None:
        current_user.bio = bio

    if profile_image_url is not None:
        current_user.profile_image_url = profile_image_url

    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)
