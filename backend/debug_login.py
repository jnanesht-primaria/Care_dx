"""
Diagnostic script — run this from the backend folder:
    python debug_login.py

It checks, in order:
1. Can we connect to MySQL / Care_dx at all?
2. Does the given username exist?
3. Does the given password match the stored hash?

This bypasses Flask/HTTP entirely so you know whether the problem
is in the database or in the API layer.
"""
from app import app
from models import db, User

def main():
    email = input("Email to test: ").strip().lower()
    password = input("Password to test: ").strip()

    with app.app_context():
        try:
            total_users = User.query.count()
        except Exception as e:
            print("\n❌ Could not query the database at all.")
            print("   Check MySQL is running and config.py credentials are correct.")
            print(f"   Error: {e}")
            return

        print(f"\n✅ Connected. Total users in DB: {total_users}")

        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ No user found with email '{email}'.")
            print("   Existing emails:", [u.email for u in User.query.all()])
            return

        print(f"✅ Found user: {user.username} | role={user.role.value} | active={user.is_active}")
        print(f"   Stored hash: {user.password_hash[:40]}...")

        if user.check_password(password):
            print("✅ Password MATCHES. Login should work — if it still fails via the API, "
                  "the issue is likely CORS, the request body, or the frontend not sending JSON correctly.")
        else:
            print("❌ Password does NOT match the stored hash.")
            print("   Either the password is wrong, or this user's hash was set with a different password.")
            print("   Fix: delete this user and re-run seed_users.py, or run create_user.py to reset it.")

if __name__ == "__main__":
    main()
