"""
Seeds the database with one ready-to-use login for each role:
ADMIN, TECHNICIAN, RECEPTIONIST.

Run once after the database exists:
    python seed_users.py

Safe to re-run -- skips any username that already exists.
"""
from app import app
from models import db, User, RoleEnum

DEFAULT_USERS = [
    {"username": "admin1",       "email": "admin1@caredx.com",       "password": "Admin@123",       "role": RoleEnum.ADMIN},
    {"username": "technician1",  "email": "technician1@caredx.com",  "password": "Tech@123",        "role": RoleEnum.TECHNICIAN},
    {"username": "receptionist1","email": "receptionist1@caredx.com","password": "Reception@123",   "role": RoleEnum.RECEPTIONIST},
]

def main():
    with app.app_context():
        db.create_all()  # creates the users table if it doesn't exist yet

        for u in DEFAULT_USERS:
            if User.query.filter_by(username=u["username"]).first():
                print(f"Skipped (already exists): {u['username']}")
                continue

            user = User(username=u["username"], email=u["email"], role=u["role"])
            user.set_password(u["password"])
            db.session.add(user)
            print(f"Created: {u['username']} / {u['password']}  ({u['role'].value})")

        db.session.commit()
        print("\nDone. Use these credentials to log in from the React app.")

if __name__ == "__main__":
    main()
