import json
from django.db import models
from utils.encryption import encrypt_sensitive_field, decrypt_sensitive_field


class EncryptedCharField(models.CharField):
    def get_prep_value(self, value):
        if value in (None, ""):
            return value
        try:
            return encrypt_sensitive_field(str(value))
        except Exception:
            return value

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            return decrypt_sensitive_field(value)
        except Exception:
            return value

    def to_python(self, value):
        if value in (None, ""):
            return value
        if isinstance(value, str):
            try:
                return decrypt_sensitive_field(value)
            except Exception:                return value
        return value


class EncryptedTextField(models.TextField):
    def get_prep_value(self, value):
        if value in (None, ""):
            return value
        try:
            return encrypt_sensitive_field(str(value))
        except Exception:
            return value

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            return decrypt_sensitive_field(value)
        except Exception:
            return value

    def to_python(self, value):
        if value in (None, ""):
            return value
        if isinstance(value, str):
            try:
                return decrypt_sensitive_field(value)
            except Exception:
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
        try:
            return encrypt_sensitive_field(payload)
        except Exception:
            return payload

    def from_db_value(self, value, expression, connection):
        if value in (None, ""):
            return value
        try:
            decrypted = decrypt_sensitive_field(value)
        except Exception:
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
                decrypted = value
            try:
                return json.loads(decrypted)
            except Exception:
                return decrypted
        return value
