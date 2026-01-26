from cryptography.fernet import Fernet
import base64
import os

# Get encryption key from environment or generate a new one (should be set in production)
ENCRYPT_KEY = os.environ.get('ENCRYPT_KEY')
if not ENCRYPT_KEY:
    ENCRYPT_KEY = base64.urlsafe_b64encode(Fernet.generate_key()).decode()
fernet = Fernet(ENCRYPT_KEY.encode())

def encrypt_value(value: str) -> str:
    if value is None:
        return None
    return fernet.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    if value is None:
        return None
    return fernet.decrypt(value.encode()).decode()
