from flask import Blueprint, request, jsonify, current_app
from models import db, Patient, Test, Booking, BookingItem, Sample, Report, User
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

# ---------- Dashboard ----------
@technician_bp.route('/dashboard', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def dashboard():
    user_id = request.user.id
    date_str = request.args.get('date')

    query = Booking.query.filter_by(assigned_to=user_id)
    if date_str:
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(func.date(Booking.booking_date) == d)
        except ValueError:
            pass

    total = query.count()
    pending = query.filter(Booking.status == 'Pending').count()
    in_progress = query.filter(Booking.status == 'Processing').count()
    completed = query.filter(Booking.status == 'Completed').count()
    total_patients = Patient.query.count()

    return jsonify({
        'total': total,
        'pending': pending,
        'in_progress': in_progress,
        'completed': completed,        # ✅ uncommented and properly placed
        'totalPatients': total_patients
    })

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
        address_type=data.get('address_type'),
        city=data.get('city'),
        email=data.get('email'),
        id_proof_type=data.get('id_proof_type'),
        id_proof_number=data.get('id_proof_number'),
        referral_source=data.get('referral_source'),
        referral_doctor=data.get('referral_doctor'),
        username=data.get('username')
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
# ---------- Get Tests (for booking) ----------
@technician_bp.route('/tests', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_tests():
    tests = Test.query.filter_by(is_active=True).all()
    return jsonify([t.to_dict() for t in tests])

# ---------- Book Tests (assign to technician) ----------
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
        assigned_to=request.user.id,   # assign to the current technician
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

# ---------- Tests Queue (assigned to current technician) ----------
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
    # else scope == 'all' – show all bookings (still filter by date/search)

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
            'id': b.id,                      # ⬅️ frontend expects 'id'
            'patient_id': b.patient_id,
            'patient_name': f"{b.patient.first_name} {b.patient.last_name}",
            'age': b.patient.age,
            'gender': b.patient.gender,
            'status': b.status,
            'booking_date': b.booking_date.isoformat() if b.booking_date else None,
            'tests': test_names,
            # add any other fields used by your QueueTable component
        })
    return jsonify(result)
# ---------- Sample Collection (Patient & Test Status) ----------
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

    # Generate sample ID
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

    # Update booking status to 'Sample Collected'
    booking.status = 'Sample Collected'
    db.session.commit()

    return jsonify({
        'message': 'Sample collected successfully',
        'sample_id': sample_id,
        'booking_status': booking.status
    }), 201

# ---------- Reporting: Get tests for a booking (to enter results) ----------
@technician_bp.route('/bookings/<int:booking_id>/tests', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_booking_tests(booking_id):
    booking = Booking.query.get(booking_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404
    # Ensure technician has access (optional: check assigned_to)
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    items = BookingItem.query.filter_by(booking_id=booking_id).all()
    result = []
    for item in items:
        # Check if report already exists
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

# ---------- Save/Update Report (Draft or Submit) ----------
@technician_bp.route('/reports', methods=['POST'])
@role_required(['TECHNICIAN', 'ADMIN'])
def save_report():
    data = request.json
    booking_item_id = data.get('booking_item_id')
    result_data = data.get('result_data')  # should be dict
    status = data.get('status', 'Draft')   # 'Draft' or 'Pending'
    report_date = datetime.strptime(data['report_date'], '%Y-%m-%d').date() if data.get('report_date') else date.today()

    booking_item = BookingItem.query.get(booking_item_id)
    if not booking_item:
        return jsonify({'message': 'Booking item not found'}), 404

    # Verify the technician is assigned to the parent booking
    booking = Booking.query.get(booking_item.booking_id)
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    # Check if report exists
    report = Report.query.filter_by(booking_item_id=booking_item_id).first()
    if report:
        # Update existing
        report.result_data = result_data
        report.status = status
        report.report_date = report_date
        report.updated_at = datetime.utcnow()
    else:
        # Create new
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

# ---------- Report Management (list with filters) ----------
@technician_bp.route('/reports', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def list_reports():
    patient_name = request.args.get('patient_name', '')
    test_name = request.args.get('test_name', '')
    report_date = request.args.get('date', '')
    status_filter = request.args.get('status', '')

    query = Report.query
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

    # Only show reports for bookings assigned to this technician (unless admin)
    if request.user.role.value != 'ADMIN':
        query = query.join(BookingItem).join(Booking).filter(Booking.assigned_to == request.user.id)

    reports = query.order_by(Report.report_date.desc()).all()
    return jsonify([r.to_dict() for r in reports])

# ---------- Upload Report File (PDF) ----------
# This would require file upload handling. For simplicity, we'll just update file_path.
@technician_bp.route('/reports/<int:report_id>/upload', methods=['PUT'])
@role_required(['TECHNICIAN', 'ADMIN'])
def upload_report_file(report_id):
    data = request.json
    file_path = data.get('file_path')
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'message': 'Report not found'}), 404
    # Verify access
    booking_item = BookingItem.query.get(report.booking_item_id)
    booking = Booking.query.get(booking_item.booking_id)
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    report.file_path = file_path
    report.status = 'Uploaded'
    db.session.commit()
    return jsonify({'message': 'File uploaded', 'file_path': file_path}), 200

# ---------- Billing (same as receptionist; can reuse) ----------
# For brevity, we can point to a common billing endpoint or duplicate logic.
# We'll implement a simple invoice fetch.
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
# ============================================================
# Test Results (for appointments)
# ============================================================

@technician_bp.route('/appointments/<int:appointment_id>/result', methods=['GET'])
@role_required(['TECHNICIAN', 'ADMIN'])
def get_appointment_result(appointment_id):
    """Get the result for a specific appointment (booking)."""
    booking = Booking.query.get(appointment_id)
    if not booking:
        return jsonify({'message': 'Booking not found'}), 404

    # Check if the technician is assigned to this booking
    if booking.assigned_to != request.user.id and request.user.role.value != 'ADMIN':
        return jsonify({'message': 'Access forbidden'}), 403

    # Find the first report for this booking (or combine all)
    # Assuming each booking has one or more items; we'll return the first report
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
    """Submit result for an appointment (booking)."""
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

    # Find or create a report for the first booking item (or handle multiple)
    # For simplicity, we'll update/create a report for the first item
    first_item = BookingItem.query.filter_by(booking_id=appointment_id).first()
    if not first_item:
        return jsonify({'message': 'No test items found for this booking'}), 400

    report = Report.query.filter_by(booking_item_id=first_item.id).first()
    if not report:
        # Create a new report
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
        # Update existing
        report.result_data = {'summary': result_summary, 'notes': notes}
        report.status = 'Pending'
        report.updated_at = datetime.utcnow()

    # Also update booking status to 'Processing' (or keep as is)
    booking.status = 'Processing'
    db.session.commit()

    return jsonify({'message': 'Result saved successfully'}), 200