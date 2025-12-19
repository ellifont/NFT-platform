"""Authentication service for wallet-based auth using Ethereum signatures"""

import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import User
from app.services.web3_service import web3_service

settings = get_settings()


class AuthError(Exception):
    """Custom exception for authentication errors"""
    pass


class AuthService:
    """Service for wallet-based authentication"""

    # Message template for signing
    SIGN_MESSAGE_TEMPLATE = """Welcome to NFT Marketplace!

Click to sign in and accept the Terms of Service.

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address:
{address}

Nonce:
{nonce}"""

    def __init__(self):
        self.secret_key = settings.jwt_secret_key
        self.algorithm = settings.jwt_algorithm
        self.expire_minutes = settings.jwt_expire_minutes

    def generate_nonce(self) -> str:
        """Generate a random nonce for signing"""
        return secrets.token_hex(32)

    def get_sign_message(self, address: str, nonce: str) -> str:
        """
        Get the message to be signed by the user

        Args:
            address: Wallet address
            nonce: Random nonce

        Returns:
            Formatted message for signing
        """
        return self.SIGN_MESSAGE_TEMPLATE.format(
            address=address.lower(),
            nonce=nonce
        )

    def get_or_create_user(self, db: Session, wallet_address: str) -> tuple[User, bool]:
        """
        Get existing user or create new one

        Args:
            db: Database session
            wallet_address: Ethereum wallet address

        Returns:
            Tuple of (user, is_new)
        """
        # Normalize address to lowercase
        normalized_address = wallet_address.lower()

        # Check if valid Ethereum address
        if not web3_service.is_valid_address(wallet_address):
            raise AuthError("Invalid Ethereum address")

        # Look for existing user
        user = db.query(User).filter(
            User.wallet_address == normalized_address
        ).first()

        if user:
            return user, False

        # Create new user
        user = User(
            wallet_address=normalized_address,
            nonce=self.generate_nonce()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return user, True

    def generate_nonce_for_user(self, db: Session, wallet_address: str) -> str:
        """
        Generate and save a new nonce for a user

        Args:
            db: Database session
            wallet_address: Ethereum wallet address

        Returns:
            The generated nonce
        """
        user, _ = self.get_or_create_user(db, wallet_address)

        # Generate new nonce
        nonce = self.generate_nonce()
        user.nonce = nonce
        db.commit()

        return nonce

    def verify_signature_and_login(
        self,
        db: Session,
        wallet_address: str,
        signature: str
    ) -> dict:
        """
        Verify signature and create JWT token

        Args:
            db: Database session
            wallet_address: Ethereum wallet address
            signature: Signed message signature

        Returns:
            Dict with access_token and user info

        Raises:
            AuthError: If signature verification fails
        """
        # Normalize address
        normalized_address = wallet_address.lower()

        # Get user
        user = db.query(User).filter(
            User.wallet_address == normalized_address
        ).first()

        if not user:
            raise AuthError("User not found. Please request a nonce first.")

        if not user.nonce:
            raise AuthError("No nonce found. Please request a nonce first.")

        # Build the message that should have been signed
        message = self.get_sign_message(normalized_address, user.nonce)

        # Verify signature
        if not web3_service.verify_signature(message, signature, wallet_address):
            raise AuthError("Invalid signature")

        # Regenerate nonce to prevent replay attacks
        user.nonce = self.generate_nonce()
        user.last_login = datetime.utcnow()
        db.commit()

        # Create JWT token
        access_token = self.create_access_token(
            data={"sub": normalized_address, "user_id": user.id}
        )

        # Refresh user to get updated fields
        db.refresh(user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user  # Return full user object for Pydantic validation
        }

    def create_access_token(
        self,
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token

        Args:
            data: Data to encode in the token
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.expire_minutes)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

        return encoded_jwt

    def verify_token(self, token: str) -> dict:
        """
        Verify and decode a JWT token

        Args:
            token: JWT token string

        Returns:
            Decoded token payload

        Raises:
            AuthError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except JWTError as e:
            raise AuthError(f"Invalid token: {str(e)}")

    def get_current_user(self, db: Session, token: str) -> User:
        """
        Get current user from JWT token

        Args:
            db: Database session
            token: JWT token string

        Returns:
            User object

        Raises:
            AuthError: If token invalid or user not found
        """
        payload = self.verify_token(token)

        wallet_address = payload.get("sub")
        if not wallet_address:
            raise AuthError("Invalid token payload")

        user = db.query(User).filter(
            User.wallet_address == wallet_address
        ).first()

        if not user:
            raise AuthError("User not found")

        return user

    def require_admin(self, user: User) -> None:
        """
        Check if user is admin

        Args:
            user: User object

        Raises:
            AuthError: If user is not admin
        """
        if not user.is_admin:
            raise AuthError("Admin access required")

    def require_artist(self, user: User) -> None:
        """
        Check if user is artist

        Args:
            user: User object

        Raises:
            AuthError: If user is not artist
        """
        if not user.is_artist:
            raise AuthError("Artist access required")


# Singleton instance
auth_service = AuthService()
