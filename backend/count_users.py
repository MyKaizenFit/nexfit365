import os
import django
from accounts.models import CustomUser

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    total = CustomUser.objects.count()
    print(f"Total usuarios actuales: {total}")

if __name__ == '__main__':
    main()
