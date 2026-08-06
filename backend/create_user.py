"""
Quick CLI helper to create a user with a securely hashed password.

Usage:
    python create_user.py

Then follow the prompts (username, email, password, role).
"""
from app import app
from models import db, User, RoleEnum

def main():
    with app.app_context():
        db.create_all()  # creates tables if they don't exist yet

        username = input("Username: ").strip()
        email = input("Email: ").strip()
        password = input("Password: ").strip()
        print("Roles: ADMIN, TECHNICIAN, RECEPTIONIST")
        role = input("Role: ").strip().upper()

        if role not in RoleEnum.__members__:
            print("Invalid role.")
            return

        if User.query.filter_by(username=username).first():
            print("Username already exists.")
            return

        user = User(username=username, email=email, role=RoleEnum[role])
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"User '{username}' created with role {role}.")

if __name__ == "__main__":
    main()
