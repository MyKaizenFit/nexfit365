from test_settings_simple import *


class DisableMigrations(dict):
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()

VAPID_PUBLIC_KEY = "test-public-key"
VAPID_PRIVATE_KEY = "test-private-key"
VAPID_CLAIM_EMAIL = "test@example.com"
