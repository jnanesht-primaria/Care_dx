# backend/routes/admin.py
from flask import Blueprint, request, jsonify
from decorators import role_required
from models import db, User, Laboratory, Test, Patient, Booking, Report
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

# ============================================================
# Dashboard stats
# ============================================================
@admin_bp.route('/dashboard', methods=['GET'])
@role_required('ADMIN')
def dashboard():
    total_patients = Patient.query.count()
    total_tests = Test.query.count()
    pending_reports = Report.query.filter(Report.status.in_(['Draft', 'Pending'])).count()
    total_labs = Laboratory.query.count()
    total_revenue = db.session.query(func.sum(Booking.paid_amount)).scalar() or 0
    total_staff = User.query.filter(User.role.in_(['TECHNICIAN', 'RECEPTIONIST'])).count()
    upcoming_camps = 0

    return jsonify({
        "total_patients": total_patients,
        "tests_conducted": total_tests,
        "pending_reports": pending_reports,
        "collaborated_labs": total_labs,
        "total_revenue": float(total_revenue),
        "total_staff": total_staff,
        "upcoming_camps": upcoming_camps
    }), 200

# ============================================================
# User Management
# ============================================================
@admin_bp.route('/users', methods=['GET'])
@role_required('ADMIN')
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/users', methods=['POST'])
@role_required('ADMIN')
def create_user():
    data = request.get_json()
    required = ['username', 'email', 'password', 'role']
    if not all(k in data for k in required):
        return jsonify({"message": "Missing required fields"}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({"message": "Username already exists"}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"message": "Email already exists"}), 400

    user = User(
        username=data['username'],
        email=data['email'],
        role=data['role'],
        lab_id=data.get('lab_id'),
        is_active=data.get('is_active', True)
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@role_required('ADMIN')
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if 'username' in data:
        existing = User.query.filter_by(username=data['username']).first()
        if existing and existing.id != user_id:
            return jsonify({"message": "Username taken"}), 400
        user.username = data['username']
    if 'email' in data:
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user_id:
            return jsonify({"message": "Email taken"}), 400
        user.email = data['email']
    if 'role' in data:
        user.role = data['role']
    if 'lab_id' in data:
        user.lab_id = data['lab_id']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    db.session.commit()
    return jsonify(user.to_dict()), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@role_required('ADMIN')
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    # We don't have get_jwt_identity here; we can get it from request.user
    current_user_id = request.user.id if hasattr(request, 'user') else None
    if current_user_id and user.id == current_user_id:
        return jsonify({"message": "Cannot delete your own account"}), 403
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200

# ============================================================
# Partner (Laboratory) Management
# ============================================================
@admin_bp.route('/laboratories', methods=['GET'])
@role_required('ADMIN')
def list_laboratories():
    labs = Laboratory.query.all()
    return jsonify([l.to_dict() for l in labs]), 200

@admin_bp.route('/laboratories', methods=['POST'])
@role_required('ADMIN')
def create_laboratory():
    data = request.get_json()
    if not data.get('lab_name'):
        return jsonify({"message": "Missing lab_name"}), 400

    lab = Laboratory(
        lab_name=data['lab_name'],
        location=data.get('location'),
        technician_name=data.get('technician_name'),
        contact_number=data.get('contact_number'),
        email=data.get('email')
    )
    db.session.add(lab)
    db.session.commit()
    return jsonify(lab.to_dict()), 201

@admin_bp.route('/laboratories/<int:lab_id>', methods=['PUT'])
@role_required('ADMIN')
def update_laboratory(lab_id):
    lab = Laboratory.query.get_or_404(lab_id)
    data = request.get_json()
    lab.lab_name = data.get('lab_name', lab.lab_name)
    lab.location = data.get('location', lab.location)
    lab.technician_name = data.get('technician_name', lab.technician_name)
    lab.contact_number = data.get('contact_number', lab.contact_number)
    lab.email = data.get('email', lab.email)
    db.session.commit()
    return jsonify(lab.to_dict()), 200

@admin_bp.route('/laboratories/<int:lab_id>', methods=['DELETE'])
@role_required('ADMIN')
def delete_laboratory(lab_id):
    lab = Laboratory.query.get_or_404(lab_id)
    if User.query.filter_by(lab_id=lab_id).first():
        return jsonify({"message": "Lab has users assigned, cannot delete"}), 400
    if Test.query.filter_by(lab_id=lab_id).first():
        return jsonify({"message": "Lab has tests, cannot delete"}), 400
    db.session.delete(lab)
    db.session.commit()
    return jsonify({"message": "Lab deleted"}), 200

# ============================================================
# Test Catalog Management
# ============================================================
@admin_bp.route('/tests', methods=['GET'])
@role_required('ADMIN')
def list_tests():
    tests = Test.query.all()
    return jsonify([t.to_dict() for t in tests]), 200

@admin_bp.route('/tests', methods=['POST'])
@role_required('ADMIN')
def create_test():
    data = request.get_json()
    required = ['test_name', 'rate', 'lab_id']
    if not all(k in data for k in required):
        return jsonify({"message": "Missing required fields"}), 400

    test = Test(
        test_name=data['test_name'],
        rate=data['rate'],
        lab_id=data['lab_id'],
        category=data.get('category'),
        reference_range=data.get('reference_range'),
        report_template_text=data.get('report_template_text'),
        report_template_file_path=data.get('report_template_file_path'),
        is_active=data.get('is_active', True)
    )
    db.session.add(test)
    db.session.commit()
    return jsonify(test.to_dict()), 201

@admin_bp.route('/tests/<int:test_id>', methods=['PUT'])
@role_required('ADMIN')
def update_test(test_id):
    test = Test.query.get_or_404(test_id)
    data = request.get_json()
    test.test_name = data.get('test_name', test.test_name)
    test.rate = data.get('rate', test.rate)
    test.lab_id = data.get('lab_id', test.lab_id)
    test.category = data.get('category', test.category)
    test.reference_range = data.get('reference_range', test.reference_range)
    test.report_template_text = data.get('report_template_text', test.report_template_text)
    test.report_template_file_path = data.get('report_template_file_path', test.report_template_file_path)
    test.is_active = data.get('is_active', test.is_active)
    db.session.commit()
    return jsonify(test.to_dict()), 200

@admin_bp.route('/tests/<int:test_id>', methods=['DELETE'])
@role_required('ADMIN')
def delete_test(test_id):
    test = Test.query.get_or_404(test_id)
    from models import BookingItem
    if BookingItem.query.filter_by(test_id=test_id).first():
        return jsonify({"message": "Test is used in bookings, cannot delete"}), 400
    db.session.delete(test)
    db.session.commit()
    return jsonify({"message": "Test deleted"}), 200

# ============================================================
# Reports (View all reports)
# ============================================================
@admin_bp.route('/reports', methods=['GET'])
@role_required('ADMIN')
def list_reports():
    patient_id = request.args.get('patient_id', type=int)
    test_id = request.args.get('test_id', type=int)
    status = request.args.get('status')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Report.query
    if patient_id:
        query = query.filter_by(patient_id=patient_id)
    if test_id:
        query = query.filter_by(test_id=test_id)
    if status:
        query = query.filter_by(status=status)
    if date_from:
        query = query.filter(Report.report_date >= date_from)
    if date_to:
        query = query.filter(Report.report_date <= date_to)

    reports = query.all()
    return jsonify([r.to_dict() for r in reports]), 200

@admin_bp.route('/reports/<int:report_id>', methods=['GET'])
@role_required('ADMIN')
def get_report(report_id):
    report = Report.query.get_or_404(report_id)
    return jsonify(report.to_dict()), 200