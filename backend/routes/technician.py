from flask import Blueprint, request, jsonify, current_app
from models import db, Patient, Test, Booking, BookingItem, Sample, Report, User, Payment
from decorators import role_required
from sqlalchemy import func, or_
from datetime import datetime, date
import json
import re

technician_bp = Blueprint('technician', __name__, url_prefix='/technician')

# ---------- Helper to generate sample ID ----------
def generate_sample_id():
    last = Sample.query.order_by(Sample.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    return f"S-{datetime.now().strftime('%Y')}-{next_num:04d}"

# ---------- Claim an unassigned/reassign-to-self booking ----------
@technician_bp.route('/appointments/<int:appointment_id>/claim', methods=['PATCH'])
@role_required(['TECHNICIAN', 'ADMIN'])
def claim_appointment(appointment_id):
    booking = Booking.query.get(appointment_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    # Allow claiming if unassigned, or reassigning if already yours / you're an admin.
    if booking.assigned_to is not None and booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'This booking is already claimed by another technician'}), 409

    booking.assigned_to = request.user.id
    db.session.commit()

    return jsonify({
        'message': 'Appointment claimed successfully',
        'booking_id': booking.id,
        'assigned_to': booking.assigned_to
    }), 200
# ---------- Dashboard ----------
# ---------- Dashboard ----------
def _scope_bookings(query, user, is_admin):
    if not is_admin:
        query = query.filter(Booking.assigned_to == user.id)
    return query

@technician_bp.route('/dashboard', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard():
    user = request.user
    is_admin = user.role.value == 'ADMIN'
    date_str = request.args.get('date')
    target_date = date.today()
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    # ---- Today's Patients ----
    today_patients = Patient.query.filter(func.date(Patient.created_at) == target_date).count()

    # ---- Today's bookings (scoped to technician unless admin) ----
    bookings_q = _scope_bookings(
        Booking.query.filter(func.date(Booking.booking_date) == target_date), user, is_admin
    )
    booking_ids_today = [b.id for b in bookings_q.all()]

    # ---- Today's Tests ----
    items_today = []
    if booking_ids_today:
        items_today = BookingItem.query.filter(BookingItem.booking_id.in_(booking_ids_today)).all()
    today_tests = len(items_today)
    item_ids_today = [i.id for i in items_today]

    # ---- Tests Completed Today (report saved/updated today, for items booked today) ----
    completed_item_ids = set()
    if item_ids_today:
        reports = Report.query.filter(
            Report.booking_item_id.in_(item_ids_today),
            func.date(Report.updated_at) == target_date
        ).all()
        completed_item_ids = {r.booking_item_id for r in reports}
    completed_tests = len(completed_item_ids)
    pending_tests = max(today_tests - completed_tests, 0)

    # ---- Today's Invoices / Revenue (from Payment log) ----
    payments_q = Payment.query.filter(func.date(Payment.paid_at) == target_date)
    if not is_admin:
        payments_q = payments_q.join(Booking).filter(Booking.assigned_to == user.id)
    payments_today = payments_q.all()
    invoices_count = len({p.booking_id for p in payments_today})
    revenue = sum(float(p.amount) for p in payments_today)

    return jsonify({
        'today_patients': today_patients,
        'today_tests': today_tests,
        'completed_tests': completed_tests,
        'pending_tests': pending_tests,
        'invoices_count': invoices_count,
        'revenue': revenue,
        'totalPatients': Patient.query.count(),
        'date': target_date.isoformat(),
    })


# ---------- Detail endpoints for each card ----------

@technician_bp.route('/dashboard/patients-today', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard_patients_today():
    target_date = _parse_date_arg()
    patients = Patient.query.filter(func.date(Patient.created_at) == target_date).all()
    return jsonify([{
        'patient_id': p.patient_id,
        'name': f"{p.first_name} {p.last_name}",
        'age': p.age,
        'gender': p.gender,
        'mobile': p.mobile,
        'registered_at': p.created_at.isoformat() if p.created_at else None,
    } for p in patients])


@technician_bp.route('/dashboard/tests-today', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard_tests_today():
    user, is_admin, target_date = request.user, request.user.role.value == 'ADMIN', _parse_date_arg()
    bookings = _scope_bookings(
        Booking.query.filter(func.date(Booking.booking_date) == target_date), user, is_admin
    ).all()
    result = []
    for b in bookings:
        for item in b.items:
            result.append({
                'patient_name': f"{b.patient.first_name} {b.patient.last_name}",
                'test_name': item.test.test_name if item.test else 'Unknown',
                'category': item.test.category if item.test else None,
                'booking_time': b.booking_date.isoformat() if b.booking_date else None,
                'technician': b.assigned_to,
                'status': b.status,
            })
    return jsonify(result)


@technician_bp.route('/dashboard/completed-today', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard_completed_today():
    user, is_admin, target_date = request.user, request.user.role.value == 'ADMIN', _parse_date_arg()
    bookings = _scope_bookings(
        Booking.query.filter(func.date(Booking.booking_date) == target_date), user, is_admin
    ).all()
    item_ids = [i.id for b in bookings for i in b.items]
    if not item_ids:
        return jsonify([])
    reports = Report.query.filter(
        Report.booking_item_id.in_(item_ids),
        func.date(Report.updated_at) == target_date
    ).all()
    result = []
    for r in reports:
        item = BookingItem.query.get(r.booking_item_id)
        booking = Booking.query.get(item.booking_id) if item else None
        result.append({
            'patient_name': f"{booking.patient.first_name} {booking.patient.last_name}" if booking else None,
            'test_name': item.test.test_name if item and item.test else 'Unknown',
            'result_status': r.status,
            'completed_at': r.updated_at.isoformat() if r.updated_at else None,
        })
    return jsonify(result)


@technician_bp.route('/dashboard/pending-today', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard_pending_today():
    user, is_admin, target_date = request.user, request.user.role.value == 'ADMIN', _parse_date_arg()
    bookings = _scope_bookings(
        Booking.query.filter(func.date(Booking.booking_date) == target_date), user, is_admin
    ).all()
    item_ids = [i.id for b in bookings for i in b.items]
    completed_ids = set()
    if item_ids:
        completed_ids = {
            r.booking_item_id for r in Report.query.filter(
                Report.booking_item_id.in_(item_ids),
                func.date(Report.updated_at) == target_date
            ).all()
        }
    result = []
    for b in bookings:
        for item in b.items:
            if item.id not in completed_ids:
                result.append({
                    'patient_name': f"{b.patient.first_name} {b.patient.last_name}",
                    'test_name': item.test.test_name if item.test else 'Unknown',
                    'pending_since': b.booking_date.isoformat() if b.booking_date else None,
                    'technician': b.assigned_to,
                    'status': b.status,
                })
    return jsonify(result)


@technician_bp.route('/dashboard/invoices-today', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard_invoices_today():
    user, is_admin, target_date = request.user, request.user.role.value == 'ADMIN', _parse_date_arg()
    q = Payment.query.filter(func.date(Payment.paid_at) == target_date)
    if not is_admin:
        q = q.join(Booking).filter(Booking.assigned_to == user.id)
    payments = q.all()
    by_booking = {}
    for p in payments:
        by_booking.setdefault(p.booking_id, []).append(p)
    result = []
    for booking_id, pays in by_booking.items():
        booking = Booking.query.get(booking_id)
        total_today = sum(float(p.amount) for p in pays)
        result.append({
            'invoice_no': f"INV-{booking_id}",
            'patient_name': f"{booking.patient.first_name} {booking.patient.last_name}" if booking else None,
            'date': max(p.paid_at for p in pays).isoformat(),
            'amount': total_today,
            'payment_status': 'Paid' if booking and float(booking.balance or 0) == 0 else 'Partial',
            'booking_id': booking_id,
        })
    return jsonify(result)


@technician_bp.route('/dashboard/revenue-today', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard_revenue_today():
    user, is_admin, target_date = request.user, request.user.role.value == 'ADMIN', _parse_date_arg()
    q = Payment.query.filter(func.date(Payment.paid_at) == target_date)
    if not is_admin:
        q = q.join(Booking).filter(Booking.assigned_to == user.id)
    payments = q.all()
    return jsonify([{
        'patient_name': f"{p.patient.first_name} {p.patient.last_name}" if p.patient else None,
        'invoice_no': f"INV-{p.booking_id}",
        'amount': float(p.amount),
        'payment_mode': p.payment_mode,
        'paid_at': p.paid_at.isoformat() if p.paid_at else None,
    } for p in payments])


def _parse_date_arg():
    date_str = request.args.get('date')
    if date_str:
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            pass
    return date.today()
# ---------- Register Patient ----------
@technician_bp.route('/patients', methods=['POST'])
@role_required(['TECHNICIAN', 'ADMIN'])
def register_patient():
    data = request.json

    last = Patient.query.order_by(Patient.id.desc()).first()
    next_id = (last.id + 1) if last else 1
    patient_id = f"P-CDN-{next_id:03d}"

    if data.get('username'):
        existing = Patient.query.filter_by(username=data['username']).first()
        if existing:
            return jsonify({'message': 'Username already taken'}), 400

    patient = Patient(
        patient_id=patient_id,
        first_name=data['first_name'],
        last_name=data['last_name'],
        age=data.get('age'),
        gender=data.get('gender'),
        mobile=data['mobile'],
        address_type=data.get('address_type') or None,
        city=data.get('city') or None,
        email=data.get('email') or None,
        id_proof_type=data.get('id_proof_type') or None,
        id_proof_number=data.get('id_proof_number') or None,
        referral_source=data.get('referral_source') or None,
        referral_doctor=data.get('referral_doctor') or None,
        username=data.get('username') or None
    )

    if data.get('password'):
        from werkzeug.security import generate_password_hash
        patient.password_hash = generate_password_hash(data['password'])

    db.session.add(patient)
    db.session.commit()

    return jsonify(patient.to_dict()), 201


# ---------- Search Patients (GET) ----------
@technician_bp.route('/patients', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def search_patients():
    search = request.args.get('search', '').strip()
    query = Patient.query

    if search:
        query = query.filter(
            or_(
                Patient.first_name.ilike(f'%{search}%'),
                Patient.last_name.ilike(f'%{search}%'),
                Patient.patient_id.ilike(f'%{search}%'),
                Patient.mobile.ilike(f'%{search}%')
            )
        )

    patients = query.order_by(Patient.created_at.desc()).all()
    return jsonify([p.to_dict() for p in patients])


# ---------- Get pending booking for a patient ----------
@technician_bp.route('/patients/<int:patient_id>/pending-booking', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_patient_booking(patient_id):
    booking = Booking.query.filter_by(
        patient_id=patient_id,
        assigned_to=request.user.id
    ).order_by(Booking.booking_date.desc()).first()

    if not booking:
        return jsonify({'message': 'No booking found for this patient'}), 404

    items = BookingItem.query.filter_by(booking_id=booking.id).all()
    tests = []
    for item in items:
        tests.append({
            'id': item.id,
            'test_name': item.test.test_name if item.test else 'Unknown',
            'rate': float(item.rate) if item.rate is not None else 0,
            'discount': float(item.discount) if item.discount is not None else 0,
            'final_price': float(item.final_price) if item.final_price is not None else 0
        })

    return jsonify({
        'booking_id': booking.id,
        'total_amount': float(booking.total_amount) if booking.total_amount is not None else 0,
        'discount': float(booking.discount) if booking.discount is not None else 0,
        'paid_amount': float(booking.paid_amount) if booking.paid_amount is not None else 0,
        'balance': float(booking.balance) if booking.balance is not None else 0,
        'payment_mode': booking.payment_mode,
        'status': booking.status,
        'tests': tests
    }), 200


@technician_bp.route('/patients/<int:patient_id>/bookings', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_patient_bookings(patient_id):
    bookings = Booking.query.filter_by(
        patient_id=patient_id,
        assigned_to=request.user.id
    ).order_by(Booking.booking_date.desc()).all()

    if not bookings:
        return jsonify({'bookings': []}), 200

    result = []
    for b in bookings:
        items = BookingItem.query.filter_by(booking_id=b.id).all()
        tests = []
        for item in items:
            tests.append({
                'id': item.id,
                'test_name': item.test.test_name if item.test else 'Unknown',
                'rate': float(item.rate) if item.rate is not None else 0,
                'discount': float(item.discount) if item.discount is not None else 0,
                'final_price': float(item.final_price) if item.final_price is not None else 0
            })
        result.append({
            'booking_id': b.id,
            'booking_date': b.booking_date.isoformat() if b.booking_date else None,
            'status': b.status,
            'total_amount': float(b.total_amount) if b.total_amount is not None else 0,
            'paid_amount': float(b.paid_amount) if b.paid_amount is not None else 0,
            'discount': float(b.discount) if b.discount is not None else 0,
            'balance': float(b.balance) if b.balance is not None else 0,
            'payment_mode': b.payment_mode,
            'tests': tests
        })

    return jsonify({'bookings': result}), 200


# ---------- Get ALL bookings for a patient (no assigned filter) ----------
@technician_bp.route('/patients/<int:patient_id>/all-bookings', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_all_patient_bookings(patient_id):
    bookings = Booking.query.filter_by(patient_id=patient_id).order_by(Booking.booking_date.desc()).all()
    result = []
    for b in bookings:
        items = BookingItem.query.filter_by(booking_id=b.id).all()
        tests = []
        for item in items:
            tests.append({
    'id': item.id,
    'test_id': item.test_id,   # ← add this
    'test_name': item.test.test_name if item.test else 'Unknown',
    'rate': float(item.rate) if item.rate is not None else 0,
    'discount': float(item.discount) if item.discount is not None else 0,
    'final_price': float(item.final_price) if item.final_price is not None else 0
})
        result.append({
            'booking_id': b.id,
            'booking_date': b.booking_date.isoformat() if b.booking_date else None,
            'status': b.status,
            'total_amount': float(b.total_amount) if b.total_amount is not None else 0,
            'paid_amount': float(b.paid_amount) if b.paid_amount is not None else 0,
            'discount': float(b.discount) if b.discount is not None else 0,
            'balance': float(b.balance) if b.balance is not None else 0,
            'payment_mode': b.payment_mode,
            'tests': tests
        })
    return jsonify({'bookings': result}), 200


# ---------- Get Tests (for booking) ----------
@technician_bp.route('/tests', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_tests():
    tests = Test.query.filter_by(is_active=True).all()
    return jsonify([t.to_dict() for t in tests])


# ---------- Book Tests ----------
@technician_bp.route('/bookings', methods=['POST'])
@role_required(['TECHNICIAN', 'ADMIN'])
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
        assigned_to=request.user.id,
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
        'message': 'Booking created and assigned to technician'
    }), 201


# ---------- Tests Queue ----------
@technician_bp.route('/tests-queue', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def tests_queue():
    user_id = request.user.id
    scope = request.args.get('scope', 'mine')
    date_str = request.args.get('date')
    search = request.args.get('search', '').strip()

    query = Booking.query.join(Patient)

    if scope == 'mine':
        query = query.filter(Booking.assigned_to == user_id)

    if date_str:
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(func.date(Booking.booking_date) == d)
        except ValueError:
            pass

    if search:
        query = query.filter(
            or_(
                Patient.first_name.ilike(f'%{search}%'),
                Patient.last_name.ilike(f'%{search}%'),
                Patient.patient_id.ilike(f'%{search}%')
            )
        )

    bookings = query.all()
    result = []
    for b in bookings:
        test_names = [item.test.test_name for item in b.items if item.test]
        result.append({
            'id': b.id,
            'patient_id': b.patient_id,
            'patient_name': f"{b.patient.first_name} {b.patient.last_name}",
            'age': b.patient.age,
            'gender': b.patient.gender,
            'status': b.status,
            'booking_date': b.booking_date.isoformat() if b.booking_date else None,
            'tests': test_names,
        })
    return jsonify(result)


# ---------- Sample Collection ----------
@technician_bp.route('/samples', methods=['POST'])
@role_required(['TECHNICIAN', 'ADMIN'])
def collect_sample():
    data = request.json
    booking_id = data.get('booking_id')
    sample_type = data.get('sample_type')
    collection_date_time = datetime.fromisoformat(data['collection_date_time']) if data.get('collection_date_time') else datetime.utcnow()
    collection_location = data.get('collection_location')
    processed_date_time = datetime.fromisoformat(data['processed_date_time']) if data.get('processed_date_time') else None
    processing_status = data.get('processing_status', 'Pending')
    storage_location = data.get('storage_location')
    remarks = data.get('remarks')
    send_for_approval = data.get('send_for_approval', False)

    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    patient_id = booking.patient_id
    sample_id = generate_sample_id()

    sample = Sample(
        sample_id=sample_id,
        booking_id=booking_id,
        patient_id=patient_id,
        sample_type=sample_type,
        collection_date_time=collection_date_time,
        collection_location=collection_location,
        processed_date_time=processed_date_time,
        processing_status=processing_status,
        storage_location=storage_location,
        remarks=remarks,
        send_for_approval=send_for_approval,
        created_by=request.user.id
    )
    db.session.add(sample)
    booking.status = 'Sample Collected'
    db.session.commit()

    return jsonify({
        'message': 'Sample collected successfully',
        'sample_id': sample_id,
        'booking_status': booking.status
    }), 201


# ---------- Reporting ----------
@technician_bp.route('/bookings/<int:booking_id>/tests', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_booking_tests(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    items = BookingItem.query.filter_by(booking_id=booking_id).all()
    result = []
    for item in items:
        report = Report.query.filter_by(booking_item_id=item.id).first()
        result.append({
            'booking_item_id': item.id,
            'test_name': item.test.test_name if item.test else None,
            'rate': float(item.rate),
            'discount': float(item.discount),
            'final_price': float(item.final_price),
            'report': report.to_dict() if report else None
        })
    return jsonify(result)


@technician_bp.route('/reports', methods=['POST'])
@role_required(['TECHNICIAN', 'ADMIN'])
def save_report():
    data = request.json
    booking_item_id = data.get('booking_item_id')
    result_data = data.get('result_data')
    status = data.get('status', 'Draft')
    report_date = datetime.strptime(data['report_date'], '%Y-%m-%d').date() if data.get('report_date') else date.today()

    booking_item = BookingItem.query.get(booking_item_id)
    if not booking_item:
        return jsonify({'message': 'Booking item not found'}), 404

    booking = Booking.query.get(booking_item.booking_id)
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    report = Report.query.filter_by(booking_item_id=booking_item_id).first()
    if report:
        report.result_data = result_data
        report.status = status
        report.report_date = report_date
        report.updated_at = datetime.utcnow()
    else:
        report = Report(
            booking_item_id=booking_item_id,
            patient_id=booking_item.booking.patient_id,
            test_id=booking_item.test_id,
            report_date=report_date,
            status=status,
            result_data=result_data,
            created_by=request.user.id
        )
        db.session.add(report)

    db.session.commit()
    return jsonify({'message': 'Report saved', 'report_id': report.id, 'status': report.status}), 200


# ===================================================================
# Replace EVERYTHING from "@technician_bp.route('/reports', methods=['GET'])"
# (the list_reports route) down to the end of your current file with
# this block. It fixes:
#   1. list_reports — was missing its remaining filters, ordering, and
#      the return statement entirely (Flask would 500 on every call).
#   2. submit_appointment_result — was missing its return, causing
#      "did not return a valid response".
#   3. pay_booking — had literal "..." placeholders and a duplicated,
#      orphaned except block after the function had already ended,
#      which is an outright SyntaxError (app wouldn't even start).
# ===================================================================

@technician_bp.route('/reports', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def list_reports():
    patient_id = request.args.get('patient_id', type=int)
    patient_name = request.args.get('patient_name', '')
    test_name = request.args.get('test_name', '')
    report_date = request.args.get('date', '')
    status_filter = request.args.get('status', '')

    query = Report.query
    if patient_id:
        query = query.filter(Report.patient_id == patient_id)
    if patient_name:
        query = query.join(Patient).filter(
            or_(
                Patient.first_name.like(f'%{patient_name}%'),
                Patient.last_name.like(f'%{patient_name}%')
            )
        )
    if test_name:
        query = query.join(Test).filter(Test.test_name.like(f'%{test_name}%'))
    if report_date:
        try:
            d = datetime.strptime(report_date, '%Y-%m-%d').date()
            query = query.filter(func.date(Report.report_date) == d)
        except ValueError:
            pass
    if status_filter:
        query = query.filter_by(status=status_filter)

    if request.user.role.value != 'ADMIN':
        query = query.join(BookingItem).join(Booking).filter(Booking.assigned_to == request.user.id)

    reports = query.order_by(Report.report_date.desc()).all()
    return jsonify([r.to_dict() for r in reports])


@technician_bp.route('/reports/<int:report_id>/upload', methods=['PUT'])
@role_required(['TECHNICIAN', 'ADMIN'])
def upload_report_file(report_id):
    data = request.json
    file_path = data.get('file_path')
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'message': 'Report not found'}), 404
    booking_item = BookingItem.query.get(report.booking_item_id)
    booking = Booking.query.get(booking_item.booking_id)
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    report.file_path = file_path
    report.status = 'Uploaded'
    db.session.commit()
    return jsonify({'message': 'File uploaded', 'file_path': file_path}), 200


# ---------- Invoice ----------
@technician_bp.route('/bookings/<int:booking_id>/invoice', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_invoice(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404
    patient = Patient.query.get(booking.patient_id)
    return jsonify({
        'booking': booking.to_dict(),
        'patient': patient.to_dict() if patient else None
    })


# ---------- Appointment Results ----------
@technician_bp.route('/appointments/<int:appointment_id>/result', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_appointment_result(appointment_id):
    booking = Booking.query.get(appointment_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    report = Report.query.join(BookingItem).filter(BookingItem.booking_id == appointment_id).first()
    if report:
        return jsonify({
            'result_summary': report.result_data.get('summary', '') if report.result_data else '',
            'notes': report.notes if hasattr(report, 'notes') else '',
            'recorded_by_name': User.query.get(report.created_by).username if report.created_by else None,
            'recorded_at': report.updated_at.isoformat() if report.updated_at else None
        }), 200
    return jsonify(None), 200


@technician_bp.route('/appointments/<int:appointment_id>/result', methods=['POST'])
@role_required(['TECHNICIAN', 'ADMIN'])
def submit_appointment_result(appointment_id):
    data = request.json
    result_summary = data.get('result_summary', '').strip()
    notes = data.get('notes', '')

    if not result_summary:
        return jsonify({'message': 'Result summary is required'}), 400

    booking = Booking.query.get(appointment_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    first_item = BookingItem.query.filter_by(booking_id=appointment_id).first()
    if not first_item:
        return jsonify({'message': 'No test items found for this booking'}), 400

    report = Report.query.filter_by(booking_item_id=first_item.id).first()
    if not report:
        report = Report(
            booking_item_id=first_item.id,
            patient_id=booking.patient_id,
            test_id=first_item.test_id,
            status='Pending',
            result_data={'summary': result_summary, 'notes': notes},
            created_by=request.user.id
        )
        db.session.add(report)
    else:
        report.result_data = {'summary': result_summary, 'notes': notes}
        report.status = 'Pending'
        report.updated_at = datetime.utcnow()

    booking.status = 'Processing'
    db.session.commit()
    return jsonify({'message': 'Result saved successfully'}), 200
@technician_bp.route('/bookings/<int:booking_id>/tests', methods=['PUT'])
@role_required(['TECHNICIAN', 'ADMIN'])
def update_booking_tests(booking_id):
    try:
        data = request.json
        test_items = data.get('tests', [])
        payment_mode = data.get('payment_mode')
        paid_amount = float(data.get('paid_amount', 0))

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'message': 'Booking not found'}), 404

        # ---- Delete old items ----
        old_items = BookingItem.query.filter_by(booking_id=booking.id).all()
        for item in old_items:
            # Delete reports
            Report.query.filter_by(booking_item_id=item.id).delete()
            db.session.delete(item)

        # ---- Add new items ----
        total = 0
        for item in test_items:
            test = Test.query.get(item.get('test_id'))
            if not test:
                return jsonify({'message': f'Test {item.get("test_id")} not found'}), 400
            rate = float(test.rate)
            discount = float(item.get('discount', 0))
            final = rate - discount
            total += final
            bi = BookingItem(
                booking_id=booking.id,
                test_id=test.id,
                rate=rate,
                discount=discount,
                final_price=final
            )
            db.session.add(bi)

        # ---- Update booking totals ----
        booking.total_amount = total
        booking.discount = sum(t.get('discount', 0) for t in test_items)
        booking.balance = max(total - paid_amount, 0)
        if payment_mode:
            booking.payment_mode = payment_mode

        db.session.commit()
        return jsonify({
            'message': 'Booking updated',
            'booking_id': booking.id,
            'total': total,
            'balance': booking.balance
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500
# ---------- Payment ----------
@technician_bp.route('/bookings/<int:booking_id>/pay', methods=['PATCH'])
@role_required(['TECHNICIAN', 'ADMIN'])
def pay_booking(booking_id):
    try:
        data = request.json
        if not data:
            return jsonify({'message': 'No data provided'}), 400

        amount = data.get('paid_amount')
        payment_mode = data.get('payment_mode')

        if amount is None:
            return jsonify({'message': 'Paid amount is required'}), 400
        try:
            amount = float(amount)
        except (ValueError, TypeError):
            return jsonify({'message': 'Paid amount must be a number'}), 400
        if amount <= 0:
            return jsonify({'message': 'Paid amount must be greater than zero'}), 400

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'message': 'Booking not found'}), 404

        total = float(booking.total_amount or 0.0)
        already_paid = float(booking.paid_amount or 0.0)

        new_paid = already_paid + amount
        if new_paid > total:
            new_paid = total  # don't allow overpayment to blow past total

        booking.paid_amount = new_paid
        booking.balance = max(total - new_paid, 0.0)
        if payment_mode:
            booking.payment_mode = payment_mode

        if booking.balance == 0 and booking.status in ('Pending', 'Processing'):
            booking.status = 'Sample Collected'

        payment = Payment(
            booking_id=booking.id,
            patient_id=booking.patient_id,
            amount=amount,
            payment_mode=payment_mode or booking.payment_mode,
            paid_by=request.user.id,
        )
        db.session.add(payment)
        db.session.commit()

        return jsonify({
            'message': 'Payment recorded',
            'booking_id': booking.id,
            'paid_amount': booking.paid_amount,
            'balance': booking.balance,
            'status': booking.status,
            'payment_id': payment.id,
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        current_app.logger.error(f'Payment error: {e}')
        db.session.rollback()
        return jsonify({'message': f'Server error: {str(e)}'}), 500