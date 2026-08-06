from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import enum

db = SQLAlchemy()

# ---------- Role Enum ----------
class RoleEnum(enum.Enum):
    ADMIN = "ADMIN"
    TECHNICIAN = "TECHNICIAN"
    RECEPTIONIST = "RECEPTIONIST"

# ---------- Laboratory Model (NEW) ----------
class Laboratory(db.Model):
    __tablename__ = 'laboratories'
    id = db.Column(db.Integer, primary_key=True)
    lab_name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(255))
    technician_name = db.Column(db.String(100))
    contact_number = db.Column(db.String(15))
    email = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # relationships
    users = db.relationship('User', backref='lab', lazy=True)
    tests = db.relationship('Test', backref='laboratory', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "lab_name": self.lab_name,
            "location": self.location,
            "technician_name": self.technician_name,
            "contact_number": self.contact_number,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# ---------- User Model (updated with lab_id) ----------
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(RoleEnum), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    lab_id = db.Column(db.Integer, db.ForeignKey('laboratories.id'), nullable=True)  # NEW

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password, method="pbkdf2:sha256")

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role.value,
            "is_active": self.is_active,
            "lab_id": self.lab_id,
            "lab_name": self.lab.lab_name if self.lab else None
        }

# ---------- Patient Model (unchanged) ----------
class Patient(db.Model):
    __tablename__ = 'patients'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.String(20), unique=True, nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.Enum('Male', 'Female', 'Other'))
    mobile = db.Column(db.String(15), nullable=False)
    address_type = db.Column(db.String(50))
    city = db.Column(db.String(50))
    email = db.Column(db.String(120))
    id_proof_type = db.Column(db.String(50))
    id_proof_number = db.Column(db.String(50))
    referral_source = db.Column(db.String(50))
    referral_doctor = db.Column(db.String(50))
    username = db.Column(db.String(80), unique=True)
    password_hash = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bookings = db.relationship('Booking', backref='patient', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "age": self.age,
            "gender": self.gender,
            "mobile": self.mobile,
            "address_type": self.address_type,
            "city": self.city,
            "email": self.email,
            "id_proof_type": self.id_proof_type,
            "id_proof_number": self.id_proof_number,
            "referral_source": self.referral_source,
            "referral_doctor": self.referral_doctor,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ---------- Test Model (updated with lab_id and extra fields) ----------
class Test(db.Model):
    __tablename__ = 'tests'
    id = db.Column(db.Integer, primary_key=True)
    test_name = db.Column(db.String(100), nullable=False)
    rate = db.Column(db.Numeric(10,2), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    lab_id = db.Column(db.Integer, db.ForeignKey('laboratories.id'), nullable=False)  # NEW
    category = db.Column(db.String(50))          # NEW
    reference_range = db.Column(db.String(100))  # NEW
    report_template_text = db.Column(db.Text)    # NEW
    report_template_file_path = db.Column(db.String(255))  # NEW

    def to_dict(self):
        return {
            "id": self.id,
            "test_name": self.test_name,
            "rate": float(self.rate),
            "is_active": self.is_active,
            "lab_id": self.lab_id,
            "lab_name": self.laboratory.lab_name if self.laboratory else None,
            "category": self.category,
            "reference_range": self.reference_range,
            "report_template_text": self.report_template_text,
            "report_template_file_path": self.report_template_file_path,
        }

# ---------- Booking Model (unchanged, but note assigned_to is added via migration) ----------
class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    booking_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_amount = db.Column(db.Numeric(10,2))
    discount = db.Column(db.Numeric(10,2), default=0)
    paid_amount = db.Column(db.Numeric(10,2))
    balance = db.Column(db.Numeric(10,2))
    payment_mode = db.Column(db.Enum('Cash', 'Card', 'Online', 'Insurance', 'Other'))
    status = db.Column(db.Enum('Pending', 'Sample Collected', 'Processing', 'Completed', 'Approved', 'Uploaded', 'Delivered'), default='Pending')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # added via migration

    items = db.relationship('BookingItem', backref='booking', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "booking_date": self.booking_date.isoformat() if self.booking_date else None,
            "total_amount": float(self.total_amount) if self.total_amount else 0,
            "discount": float(self.discount) if self.discount else 0,
            "paid_amount": float(self.paid_amount) if self.paid_amount else 0,
            "balance": float(self.balance) if self.balance else 0,
            "payment_mode": self.payment_mode,
            "status": self.status,
            "created_by": self.created_by,
            "assigned_to": self.assigned_to,
            "items": [item.to_dict() for item in self.items]
        }

# ---------- BookingItem (unchanged) ----------
class BookingItem(db.Model):
    __tablename__ = 'booking_items'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    rate = db.Column(db.Numeric(10,2), nullable=False)
    discount = db.Column(db.Numeric(10,2), default=0)
    final_price = db.Column(db.Numeric(10,2), nullable=False)

    test = db.relationship('Test')

    def to_dict(self):
        return {
            "id": self.id,
            "test_id": self.test_id,
            "test_name": self.test.test_name if self.test else None,
            "rate": float(self.rate),
            "discount": float(self.discount),
            "final_price": float(self.final_price),
        }

# ---------- FinanceEntry (unchanged) ----------
class FinanceEntry(db.Model):
    __tablename__ = 'finance_entries'
    id = db.Column(db.Integer, primary_key=True)
    staff_name = db.Column(db.String(100))
    role = db.Column(db.String(50))
    type = db.Column(db.Enum('Income', 'Expense'), nullable=False)
    category = db.Column(db.String(50))
    amount = db.Column(db.Numeric(10,2), nullable=False)
    paid = db.Column(db.Numeric(10,2))
    balance = db.Column(db.Numeric(10,2))
    remarks = db.Column(db.Text)
    entry_date = db.Column(db.Date)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "staff_name": self.staff_name,
            "role": self.role,
            "type": self.type,
            "category": self.category,
            "amount": float(self.amount) if self.amount else 0,
            "paid": float(self.paid) if self.paid else 0,
            "balance": float(self.balance) if self.balance else 0,
            "remarks": self.remarks,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ---------- CampBudget (unchanged) ----------
class CampBudget(db.Model):
    __tablename__ = 'camp_budgets'
    id = db.Column(db.Integer, primary_key=True)
    camp_name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(255))
    budget_allocation = db.Column(db.Numeric(10,2))
    equipment_materials = db.Column(db.Text)
    total_amount = db.Column(db.Numeric(10,2))
    paid_amount = db.Column(db.Numeric(10,2))
    balance = db.Column(db.Numeric(10,2))
    camp_date = db.Column(db.Date)
    status = db.Column(db.Enum('Scheduled', 'Ongoing', 'Completed', 'Cancelled'), default='Scheduled')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "camp_name": self.camp_name,
            "location": self.location,
            "budget_allocation": float(self.budget_allocation) if self.budget_allocation else 0,
            "equipment_materials": self.equipment_materials,
            "total_amount": float(self.total_amount) if self.total_amount else 0,
            "paid_amount": float(self.paid_amount) if self.paid_amount else 0,
            "balance": float(self.balance) if self.balance else 0,
            "camp_date": self.camp_date.isoformat() if self.camp_date else None,
            "status": self.status,
        }

# ---------- CampPatient (unchanged) ----------
class CampPatient(db.Model):
    __tablename__ = 'camp_patients'
    id = db.Column(db.Integer, primary_key=True)
    camp_name = db.Column(db.String(100), nullable=False)
    camp_location = db.Column(db.String(255))
    camp_date = db.Column(db.Date)
    coordinator_name = db.Column(db.String(100))
    staff_name = db.Column(db.String(100))
    role = db.Column(db.String(50))
    contact_number = db.Column(db.String(15))
    patient_count = db.Column(db.Integer)
    follow_up_count = db.Column(db.Integer)
    tests_conducted = db.Column(db.Text)   # store JSON string
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "camp_name": self.camp_name,
            "camp_location": self.camp_location,
            "camp_date": self.camp_date.isoformat() if self.camp_date else None,
            "coordinator_name": self.coordinator_name,
            "staff_name": self.staff_name,
            "role": self.role,
            "contact_number": self.contact_number,
            "patient_count": self.patient_count,
            "follow_up_count": self.follow_up_count,
            "tests_conducted": self.tests_conducted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ---------- Sample (unchanged) ----------
class Sample(db.Model):
    __tablename__ = 'samples'
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.String(20), unique=True, nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    sample_type = db.Column(db.Enum('Blood', 'Urine', 'Swab', 'Other'), nullable=False)
    collection_date_time = db.Column(db.DateTime, nullable=False)
    collection_location = db.Column(db.String(100))
    processed_date_time = db.Column(db.DateTime)
    processing_status = db.Column(db.Enum('Pending', 'Processing', 'Completed'), default='Pending')
    storage_location = db.Column(db.String(100))
    remarks = db.Column(db.Text)
    send_for_approval = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sample_id": self.sample_id,
            "booking_id": self.booking_id,
            "patient_id": self.patient_id,
            "sample_type": self.sample_type,
            "collection_date_time": self.collection_date_time.isoformat() if self.collection_date_time else None,
            "collection_location": self.collection_location,
            "processed_date_time": self.processed_date_time.isoformat() if self.processed_date_time else None,
            "processing_status": self.processing_status,
            "storage_location": self.storage_location,
            "remarks": self.remarks,
            "send_for_approval": self.send_for_approval,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

# ---------- Report (unchanged) ----------
class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    booking_item_id = db.Column(db.Integer, db.ForeignKey('booking_items.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    report_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum('Draft', 'Pending', 'Approved', 'Rejected', 'Uploaded'), default='Draft')
    file_path = db.Column(db.String(255))
    result_data = db.Column(db.JSON)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "booking_item_id": self.booking_item_id,
            "patient_id": self.patient_id,
            "test_id": self.test_id,
            "report_date": self.report_date.isoformat() if self.report_date else None,
            "status": self.status,
            "file_path": self.file_path,
            "result_data": self.result_data,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }