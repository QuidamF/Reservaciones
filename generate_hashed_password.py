from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

# Replace 'your_admin_password' with the actual password you want for the admin user
admin_password = "your_admin_password"
hashed_admin_password = get_password_hash(admin_password)
print(f"Hashed password for '{admin_password}': {hashed_admin_password}")
