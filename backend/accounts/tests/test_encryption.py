"""
Tests for accounts.encryption module.
Covers encrypt/decrypt round-trips and edge cases.
"""
import pytest
from cryptography.fernet import Fernet
import base64
import os


@pytest.fixture(autouse=True)
def set_encryption_key(monkeypatch):
    """Ensure a stable Fernet key is set for all tests.
    Fernet.generate_key() already returns a valid URL-safe base64 key — no extra encoding needed.
    """
    # Fernet.generate_key() returns bytes like b'ZmFrZW...' — already a valid 32-byte base64 key
    key = Fernet.generate_key().decode()
    monkeypatch.setenv("ENCRYPT_KEY", key)
    # Reload so the module picks up the new ENCRYPT_KEY from env
    import importlib
    import accounts.encryption as enc_module
    importlib.reload(enc_module)
    return enc_module


@pytest.mark.unit
class TestEncryptValue:
    def test_encrypt_returns_string(self, set_encryption_key):
        enc = set_encryption_key
        result = enc.encrypt_value("hello")
        assert isinstance(result, str)

    def test_encrypt_produces_different_output_than_input(self, set_encryption_key):
        enc = set_encryption_key
        result = enc.encrypt_value("mysecret")
        assert result != "mysecret"

    def test_encrypt_none_returns_none(self, set_encryption_key):
        enc = set_encryption_key
        assert enc.encrypt_value(None) is None

    def test_encrypt_empty_string(self, set_encryption_key):
        enc = set_encryption_key
        result = enc.encrypt_value("")
        assert isinstance(result, str)
        assert result != ""

    def test_encrypt_unicode_value(self, set_encryption_key):
        enc = set_encryption_key
        result = enc.encrypt_value("contraseña_ñ_中文")
        assert isinstance(result, str)

    def test_two_encryptions_of_same_value_are_different(self, set_encryption_key):
        """Fernet uses random IV so each encryption produces unique ciphertext."""
        enc = set_encryption_key
        r1 = enc.encrypt_value("same")
        r2 = enc.encrypt_value("same")
        assert r1 != r2


@pytest.mark.unit
class TestDecryptValue:
    def test_decrypt_none_returns_none(self, set_encryption_key):
        enc = set_encryption_key
        assert enc.decrypt_value(None) is None

    def test_round_trip_basic_string(self, set_encryption_key):
        enc = set_encryption_key
        original = "hello world"
        encrypted = enc.encrypt_value(original)
        decrypted = enc.decrypt_value(encrypted)
        assert decrypted == original

    def test_round_trip_empty_string(self, set_encryption_key):
        enc = set_encryption_key
        encrypted = enc.encrypt_value("")
        decrypted = enc.decrypt_value(encrypted)
        assert decrypted == ""

    def test_round_trip_unicode(self, set_encryption_key):
        enc = set_encryption_key
        original = "contraseña_ñ_中文_🔒"
        encrypted = enc.encrypt_value(original)
        decrypted = enc.decrypt_value(encrypted)
        assert decrypted == original

    def test_round_trip_long_string(self, set_encryption_key):
        enc = set_encryption_key
        original = "a" * 10000
        encrypted = enc.encrypt_value(original)
        decrypted = enc.decrypt_value(encrypted)
        assert decrypted == original

    def test_round_trip_special_characters(self, set_encryption_key):
        enc = set_encryption_key
        original = "p@$$w0rd!#%&*()-+=[]{}|;':\",.<>?/`~"
        encrypted = enc.encrypt_value(original)
        decrypted = enc.decrypt_value(encrypted)
        assert decrypted == original

    def test_decrypt_invalid_token_raises(self, set_encryption_key):
        enc = set_encryption_key
        with pytest.raises(Exception):
            enc.decrypt_value("not-a-valid-fernet-token")
