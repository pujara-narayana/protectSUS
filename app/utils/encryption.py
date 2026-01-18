"""Encryption utilities for secure token storage"""

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
from app.core.config import settings


def _get_encryption_key() -> bytes:
    """
    Derive encryption key from SECRET_KEY using PBKDF2.

    Returns:
        bytes: Encryption key suitable for Fernet
    """
    # Use a fixed salt for deterministic key generation
    # In production, you might want to store this separately
    salt = b'protectsus_token_encryption_salt'

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )

    key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
    return key


def encrypt_token(token: str) -> str:
    """
    Encrypt a token using Fernet symmetric encryption.

    Args:
        token: Plain text token to encrypt

    Returns:
        str: Encrypted token (base64 encoded)
    """
    key = _get_encryption_key()
    f = Fernet(key)
    encrypted_token = f.encrypt(token.encode())
    return encrypted_token.decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt an encrypted token.

    Args:
        encrypted_token: Encrypted token (base64 encoded)

    Returns:
        str: Decrypted plain text token

    Raises:
        cryptography.fernet.InvalidToken: If decryption fails
    """
    key = _get_encryption_key()
    f = Fernet(key)
    decrypted_token = f.decrypt(encrypted_token.encode())
    return decrypted_token.decode()
