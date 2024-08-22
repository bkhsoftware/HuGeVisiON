import os

class Config:
    DB_NAME = os.environ.get('DB_NAME', 'huge_vision')
    DB_USER = os.environ.get('DB_USER', 'default_user')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'default_password')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default_secret_key')

