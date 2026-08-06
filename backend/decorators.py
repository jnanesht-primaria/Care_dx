# backend/decorators.py
from functools import wraps
from flask import jsonify, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from models import User

def role_required(*allowed_roles):
    """
    Decorator for role-based access control.
    Accepts either:
        - multiple strings: @role_required('ADMIN', 'TECHNICIAN')
        - a list: @role_required(['ADMIN', 'TECHNICIAN'])
        - a single string: @role_required('RECEPTIONIST')
    """
    # If the first argument is a list, use that as the allowed roles
    if len(allowed_roles) == 1 and isinstance(allowed_roles[0], list):
        allowed_roles = tuple(allowed_roles[0])

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Skip authentication for OPTIONS preflight
            if request.method == 'OPTIONS':
                return fn(*args, **kwargs)

            # Verify JWT
            try:
                verify_jwt_in_request()
            except Exception:
                return jsonify({"message": "Missing or invalid token"}), 401

            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user:
                return jsonify({"message": "User not found"}), 404

            if user.role.value not in allowed_roles:
                return jsonify({"message": "Access forbidden: insufficient role"}), 403

            request.user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator