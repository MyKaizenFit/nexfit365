import pytest
from api.jwt_blacklist_recovery import is_jwt_blacklist_corruption


@pytest.mark.parametrize(
    "message",
    [
        'unexpected data beyond EOF in block 1 of relation base/17547/17840',
        'could not open file "base/17547/18214": No such file or directory',
        "could not read block 5 in file",
    ],
)
def test_is_jwt_blacklist_corruption_detects_pg_errors(message):
    assert is_jwt_blacklist_corruption(Exception(message)) is True


def test_is_jwt_blacklist_corruption_ignores_unrelated_errors():
    assert is_jwt_blacklist_corruption(Exception("No active account found")) is False
