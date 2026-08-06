# backend/routes/receptionist.py
from flask import Blueprint, request, jsonify, current_app
from models import db, Patient, Test, Booking, BookingItem, FinanceEntry, CampBudget, CampPatient
from decorators import role_required
from sqlalchemy import func, or_
from datetime import datetime, date
import json
from werkzeug.security import generate_password_hash

receptionist_bp = Blueprint('receptionist', __name__)

# ---------- Dashboard ----------
@receptionist_bp.route('/dashboard', methods=['GET'])
@role_required('RECEPTIONIST')
def dashboard():
    today = date.today()
    patients_today = Patient.query.filter(func.date(Patient.created_at) == today).count()
    bookings_today = Booking.query.filter(func.date(Booking.booking_date) == today).count()
    pending_reports = Booking.query.filter(Booking.status.in_(['Pending', 'Sample Collected', 'Processing'])).count()
    collections = db.session.query(func.sum(Booking.paid_amount)).filter(func.date(Booking.booking_date) == today).scalar() or 0
    camp_registrations = CampPatient.query.filter(func.date(CampPatient.created_at) == today).count()
    upcoming_camps = CampBudget.query.filter(CampBudget.status == 'Scheduled', CampBudget.camp_date >= today).count()

    return jsonify({
        'patients_today': patients_today,
        'bookings_today': bookings_today,
        'pending_reports': pending_reports,
        'collections': float(collections),
        'camp_registrations': camp_registrations,
        'upcoming_camps': upcoming_camps
    })

# ---------- Patient Search ----------
@receptionist_bp.route('/patients/search', methods=['GET'])
@role_required('RECEPTIONIST')
def search_patients():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    patients = Patient.query.filter(
        or_(
            Patient.patient_id.like(f'%{query}%'),
            Patient.first_name.like(f'%{query}%'),
            Patient.last_name.like(f'%{query}%'),
            Patient.mobile.like(f'%{query}%')
        )
    ).limit(20).all()
    return jsonify([p.to_dict() for p in patients])

# ---------- Register Patient (ONLY ONE DEFINITION) ----------
@receptionist_bp.route('/patients', methods=['POST'])
@role_required('RECEPTIONIST')
def register_patient():
    import traceback
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'Invalid JSON payload'}), 400

        # Validate required fields
        required_fields = ['first_name', 'last_name', 'mobile']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'Missing required field: {field}'}), 400

        # ---- Validation ----
        mobile = data.get('mobile', '').strip()
        if len(mobile) > 15:
            return jsonify({'message': 'Mobile number must be 15 characters or less'}), 400

        gender = data.get('gender', 'Male')
        if gender not in ['Male', 'Female', 'Other']:
            return jsonify({'message': 'Invalid gender value'}), 400

        age_str = data.get('age')
        age = None
        if age_str:
            try:
                age = int(age_str)
            except ValueError:
                return jsonify({'message': 'Age must be a number'}), 400
        # ----------------------

        # Generate patient_id
        last = Patient.query.order_by(Patient.id.desc()).first()
        next_id = (last.id + 1) if last else 1
        patient_id = f"P-CDN-{next_id:03d}"

        # Check username uniqueness
        if data.get('username'):
            existing = Patient.query.filter_by(username=data['username']).first()
            if existing:
                return jsonify({'message': 'Username already taken'}), 400

        def clean(value):
            return value.strip() if isinstance(value, str) and value else None

        patient = Patient(
            patient_id=patient_id,
            first_name=clean(data['first_name']),
            last_name=clean(data['last_name']),
            age=age,
            gender=gender,
            mobile=mobile,
            address_type=clean(data.get('address_type')),
            city=clean(data.get('city')),
            email=clean(data.get('email')),
            id_proof_type=clean(data.get('id_proof_type')),
            id_proof_number=clean(data.get('id_proof_number')),
            referral_source=clean(data.get('referral_source')),
            referral_doctor=clean(data.get('referral_doctor')),
            username=clean(data.get('username'))
        )

        if data.get('password'):
            patient.password_hash = generate_password_hash(data['password'])

        db.session.add(patient)
        db.session.commit()

        return jsonify(patient.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(traceback.format_exc())
        print("=" * 50)
        print("ERROR IN REGISTER_PATIENT:")
        traceback.print_exc()
        print("=" * 50)
        return jsonify({
            'message': 'Server error',
            'error_type': type(e).__name__,
            'details': str(e)
        }), 500

# ---------- Get Tests ----------
@receptionist_bp.route('/tests', methods=['GET'])
@role_required('RECEPTIONIST')
def get_tests():
    tests = Test.query.filter_by(is_active=True).all()
    return jsonify([t.to_dict() for t in tests])

# ---------- Create Booking ----------
@receptionist_bp.route('/bookings', methods=['POST'])
@role_required('RECEPTIONIST')
def create_booking():
    data = request.json
    patient_id = data.get('patient_id')
    test_items = data.get('tests', [])
    payment_mode = data.get('payment_mode')
    paid_amount = float(data.get('paid_amount', 0))

    if not patient_id or not test_items:
        return jsonify({'message': 'Patient ID and at least one test required'}), 400

    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({'message': 'Patient not found'}), 404

    total = 0
    items = []
    for item in test_items:
        test = Test.query.get(item.get('test_id'))
        if not test:
            return jsonify({'message': f'Test {item.get("test_id")} not found'}), 400
        rate = float(test.rate)
        discount = float(item.get('discount', 0))
        final = rate - discount
        total += final
        items.append({
            'test_id': test.id,
            'rate': rate,
            'discount': discount,
            'final_price': final
        })

    balance = total - paid_amount
    if balance < 0:
        balance = 0

    booking = Booking(
        patient_id=patient_id,
        total_amount=total,
        discount=sum(i['discount'] for i in items),
        paid_amount=paid_amount,
        balance=balance,
        payment_mode=payment_mode,
        created_by=request.user.id,
        status='Pending'
    )
    db.session.add(booking)
    db.session.flush()

    for it in items:
        bi = BookingItem(
            booking_id=booking.id,
            test_id=it['test_id'],
            rate=it['rate'],
            discount=it['discount'],
            final_price=it['final_price']
        )
        db.session.add(bi)

    db.session.commit()
    return jsonify({
        'booking_id': booking.id,
        'total': total,
        'balance': balance,
        'message': 'Booking created successfully'
    }), 201

# ---------- Update Report Status ----------
@receptionist_bp.route('/bookings/<int:booking_id>/status', methods=['PUT'])
@role_required('RECEPTIONIST')
def update_booking_status(booking_id):
    data = request.json
    new_status = data.get('status')
    if not new_status:
        return jsonify({'message': 'Status required'}), 400
    valid_statuses = ['Pending', 'Sample Collected', 'Processing', 'Completed', 'Approved', 'Uploaded', 'Delivered']
    if new_status not in valid_statuses:
        return jsonify({'message': 'Invalid status'}), 400

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    booking.status = new_status
    db.session.commit()
    return jsonify({'message': 'Status updated', 'status': new_status})

# ---------- Finance ----------
@receptionist_bp.route('/finance', methods=['POST'])
@role_required('RECEPTIONIST')
def add_finance_entry():
    data = request.json
    entry = FinanceEntry(
        staff_name=data.get('staff_name'),
        role=data.get('role'),
        type=data.get('type'),
        category=data.get('category'),
        amount=data.get('amount'),
        paid=data.get('paid'),
        balance=data.get('balance'),
        remarks=data.get('remarks'),
        entry_date=datetime.strptime(data['entry_date'], '%Y-%m-%d').date() if data.get('entry_date') else date.today(),
        created_by=request.user.id
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201

@receptionist_bp.route('/finance', methods=['GET'])
@role_required('RECEPTIONIST')
def get_finance_entries():
    entries = FinanceEntry.query.order_by(FinanceEntry.entry_date.desc()).limit(100).all()
    return jsonify([e.to_dict() for e in entries])

# ---------- Camp Budget ----------
@receptionist_bp.route('/camp-budget', methods=['POST'])
@role_required('RECEPTIONIST')
def add_camp_budget():
    data = request.json
    camp = CampBudget(
        camp_name=data['camp_name'],
        location=data.get('location'),
        budget_allocation=data.get('budget_allocation'),
        equipment_materials=data.get('equipment_materials'),
        total_amount=data.get('total_amount'),
        paid_amount=data.get('paid_amount'),
        balance=data.get('balance'),
        camp_date=datetime.strptime(data['camp_date'], '%Y-%m-%d').date() if data.get('camp_date') else None,
        status=data.get('status', 'Scheduled'),
        created_by=request.user.id
    )
    db.session.add(camp)
    db.session.commit()
    return jsonify(camp.to_dict()), 201

@receptionist_bp.route('/camp-budget', methods=['GET'])
@role_required('RECEPTIONIST')
def get_camp_budgets():
    camps = CampBudget.query.order_by(CampBudget.camp_date.desc()).all()
    return jsonify([c.to_dict() for c in camps])

# ---------- Camp Patient ----------
@receptionist_bp.route('/camp-patient', methods=['POST'])
@role_required('RECEPTIONIST')
def add_camp_patient():
    data = request.json
    tests = data.get('tests_conducted')
    if isinstance(tests, list):
        tests = json.dumps(tests)

    camp_patient = CampPatient(
        camp_name=data['camp_name'],
        camp_location=data.get('camp_location'),
        camp_date=datetime.strptime(data['camp_date'], '%Y-%m-%d').date() if data.get('camp_date') else None,
        coordinator_name=data.get('coordinator_name'),
        staff_name=data.get('staff_name'),
        role=data.get('role'),
        contact_number=data.get('contact_number'),
        patient_count=data.get('patient_count'),
        follow_up_count=data.get('follow_up_count'),
        tests_conducted=tests,
        created_by=request.user.id
    )
    db.session.add(camp_patient)
    db.session.commit()
    return jsonify(camp_patient.to_dict()), 201

@receptionist_bp.route('/camp-patient', methods=['GET'])
@role_required('RECEPTIONIST')
def get_camp_patients():
    camps = CampPatient.query.order_by(CampPatient.camp_date.desc()).all()
    return jsonify([c.to_dict() for c in camps])

# ---------- Upcoming Camps ----------
@receptionist_bp.route('/upcoming-camps', methods=['GET'])
@role_required('RECEPTIONIST')
def get_upcoming_camps():
    today = date.today()
    camps = CampBudget.query.filter(
        CampBudget.status == 'Scheduled',
        CampBudget.camp_date >= today
    ).order_by(CampBudget.camp_date.asc()).all()
    return jsonify([c.to_dict() for c in camps])

# ---------- Invoice ----------
@receptionist_bp.route('/bookings/<int:booking_id>/invoice', methods=['GET'])
@role_required('RECEPTIONIST')
def get_invoice(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404
    patient = Patient.query.get(booking.patient_id)
    return jsonify({
        'booking': booking.to_dict(),
        'patient': patient.to_dict() if patient else None
    })