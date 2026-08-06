from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from config import Config
from models import db, User
from decorators import role_required
from routes.receptionist import receptionist_bp
from routes.technician import technician_bp
from routes.admin import admin_bp

app = Flask(__name__)
app.config.from_object(Config)

# CORS
CORS(app, 
     origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

db.init_app(app)
jwt = JWTManager(app)

# ✅ Global handler for OPTIONS preflight requests
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Register Blueprints with role-specific prefixes
app.register_blueprint(receptionist_bp, url_prefix='/api/receptionist')
app.register_blueprint(technician_bp, url_prefix='/api/technician')
app.register_blueprint(admin_bp, url_prefix='/api/admin')   # ✅ no double prefix

# ---------- Global error handler ----------
@app.errorhandler(Exception)
def handle_uncaught_error(e):
    app.logger.exception("Unhandled error")
    return jsonify({"message": f"Server error: {str(e)}"}), 500

# ---------- Auth routes ----------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"message": "Account is disabled"}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role.value, "username": user.username}
    )

    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()
    }), 200

@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(user.to_dict()), 200

# ---- Debug: list all routes (remove after testing) ----
print("\n=== Registered Routes ===")
for rule in app.url_map.iter_rules():
    print(f"{rule.endpoint}: {rule.methods} {rule}")
print("==========================\n")

if __name__ == "__main__":
    app.run(debug=True, port=5000)