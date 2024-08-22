import secrets

# Generate a secure random string
secret_key = secrets.token_hex(16)  # This generates a 32-character hexadecimal string
print(f"Your new secret key is: {secret_key}")

# You can then add this to your .env file:
# SECRET_KEY=your_generated_key
