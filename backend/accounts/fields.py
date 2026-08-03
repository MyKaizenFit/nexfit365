import json
from django.db import models
from utils.encryption import (
    decrypt_sensitive_field,
    encrypt_sensitive_field,
    looks_like_fernet_token,
)


class EncryptedCharField(models.CharField):
    def get_prep_value(self, value):
        if value in (None, ""):
            return value
        # Fail closed: never persist plaintext if encryption fails.
        return encrypt_sensitive_field(str(value))

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            return decrypt_sensitive_field(value)
        except Exception:
            # Legacy plaintext rows only; ciphertext must not be returned as "names".
            if looks_like_fernet_token(value):
                raise
            return value

    def to_python(self, value):
        if value in (None, ""):
            return value
        if isinstance(value, str):
            try:
                return decrypt_sensitive_field(value)
            except Exception:
                if looks_like_fernet_token(value):
                    raise
                return value
        return value


class EncryptedTextField(models.TextField):
    def get_prep_value(self, value):
        if value in (None, ""):
            return value
        return encrypt_sensitive_field(str(value))

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            return decrypt_sensitive_field(value)
        except Exception:
            if looks_like_fernet_token(value):
                raise
            return value

    def to_python(self, value):
        if value in (None, ""):
            return value
        if isinstance(value, str):
            try:
                return decrypt_sensitive_field(value)
            except Exception:
                if looks_like_fernet_token(value):
                    raise
                return value
        return value


class EncryptedJSONField(models.TextField):
    def get_prep_value(self, value):
        if value is None:
            return value
        if isinstance(value, (dict, list)):
            payload = json.dumps(value, ensure_ascii=False)
        else:
            payload = str(value)
        return encrypt_sensitive_field(payload)

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            decrypted = decrypt_sensitive_field(value)
        except Exception:
            if looks_like_fernet_token(value):
                raise
            decrypted = value
        try:
            return json.loads(decrypted)
        except Exception:
            return decrypted

    def to_python(self, value):
        if value in (None, ""):
            return value
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            try:
                decrypted = decrypt_sensitive_field(value)
            except Exception:
                if looks_like_fernet_token(value):
                    raise
                decrypted = value
            try:
                return json.loads(decrypted)
            except Exception:
                return decrypted
        return value
