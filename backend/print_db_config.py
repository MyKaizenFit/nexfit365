from dotenv import load_dotenv
import os

load_dotenv()

print("🔎 Verificando configuración de base de datos:")
print("DB_NAME:", repr(os.getenv("DB_NAME")))
print("DB_USER:", repr(os.getenv("DB_USER")))
print("DB_PASSWORD:", repr(os.getenv("DB_PASSWORD")))
print("DB_HOST:", repr(os.getenv("DB_HOST")))
print("DB_PORT:", repr(os.getenv("DB_PORT")))
