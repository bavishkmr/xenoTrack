-- ============================================================
-- Xenotrack Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- Institute
INSERT INTO institutes (id, name, address, phone, email, timezone, currency)
VALUES (1, 'Xenotrack Demo Institute', '123 Main Street, City, State 400001', '+91-9000000001', 'admin@xenotrack.local', 'Asia/Kolkata', 'INR');

-- Admin user  (password: Admin@1234)
INSERT INTO users (id, institute_id, email, password_hash, role, full_name, phone, is_active)
VALUES (1, 1, 'admin@xenotrack.local',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', -- Admin@1234 hashed with bcrypt
  'admin', 'Super Admin', '+91-9000000001', 1);

-- Staff user  (password: Staff@1234)
INSERT INTO users (id, institute_id, email, password_hash, role, full_name, phone, is_active)
VALUES (2, 1, 'staff@xenotrack.local',
  '$2a$10$kVJBL2VqRvX9fLbFQ6Vl4.r3rK0Qn1NpXJ6yUBFcjivJMHcgNHjuu', -- Staff@1234 hashed
  'staff', 'Jane Staff', '+91-9000000002', 1);

-- Staff profile
INSERT INTO staff_profiles (user_id, institute_id, staff_code, designation, joining_date, can_collect_fees, can_edit_attendance)
VALUES (2, 1, 'STF-001', 'Instructor', '2024-01-01', 1, 1);

-- Fee plans
INSERT INTO fee_plans (id, institute_id, name, description, amount, frequency, due_day, status)
VALUES
  (1, 1, 'Monthly Standard', 'Standard monthly fee plan', 1500.00, 'monthly', 5, 'active'),
  (2, 1, 'Quarterly Plan', 'Quarterly discounted fee', 4000.00, 'quarterly', 5, 'active'),
  (3, 1, 'Annual Plan', 'Annual fee with discount', 15000.00, 'yearly', 5, 'active'),
  (4, 1, 'One-Time Registration', 'One-time registration fee', 500.00, 'one_time', NULL, 'active');

-- Programs
INSERT INTO programs (id, institute_id, name, description, program_type, default_fee_plan_id, status)
VALUES
  (1, 1, 'Mathematics Tuition', 'Grade 8-12 Mathematics coaching', 'Academic', 1, 'active'),
  (2, 1, 'Personal Fitness', 'Individual fitness training', 'Fitness', 1, 'active'),
  (3, 1, 'Football Training', 'Youth football coaching', 'Sports', 1, 'active');

-- Groups
INSERT INTO `groups` (id, institute_id, program_id, name, start_date, scheduled_days, start_time, end_time, capacity, status)
VALUES
  (1, 1, 1, 'Math Batch A (Morning)', '2024-06-01', '["Mon","Wed","Fri"]', '08:00:00', '09:30:00', 20, 'active'),
  (2, 1, 1, 'Math Batch B (Evening)', '2024-06-01', '["Tue","Thu","Sat"]', '17:00:00', '18:30:00', 20, 'active'),
  (3, 1, 2, 'Fitness Group Morning', '2024-06-01', '["Mon","Tue","Wed","Thu","Fri"]', '06:00:00', '07:00:00', 15, 'active'),
  (4, 1, 3, 'U-16 Football', '2024-06-01', '["Sat","Sun"]', '09:00:00', '11:00:00', 25, 'active');

-- Assign staff to groups
INSERT INTO group_staff_assignments (group_id, staff_profile_id, is_primary)
VALUES (1, 1, 1), (2, 1, 1), (3, 1, 0);

-- Members
INSERT INTO members (id, institute_id, member_code, full_name, phone, email, dob, gender, registration_date, status, created_by)
VALUES
  (1, 1, 'MEM-001', 'Arjun Sharma', '9876543001', 'arjun@example.com', '2008-03-15', 'male', '2024-06-01', 'active', 1),
  (2, 1, 'MEM-002', 'Priya Patel', '9876543002', 'priya@example.com', '2007-07-22', 'female', '2024-06-01', 'active', 1),
  (3, 1, 'MEM-003', 'Rahul Singh', '9876543003', NULL, '2009-01-10', 'male', '2024-06-05', 'active', 1),
  (4, 1, 'MEM-004', 'Anita Desai', '9876543004', 'anita@example.com', '2008-11-30', 'female', '2024-06-10', 'active', 1),
  (5, 1, 'MEM-005', 'Karan Mehta', '9876543005', NULL, '2009-05-18', 'male', '2024-06-15', 'active', 1),
  (6, 1, 'MEM-006', 'Sneha Joshi', '9876543006', 'sneha@example.com', '2007-09-08', 'female', '2024-06-15', 'active', 1),
  (7, 1, 'MEM-007', 'Dev Kumar', '9876543007', NULL, '2010-02-25', 'male', '2024-07-01', 'inactive', 1),
  (8, 1, 'MEM-008', 'Meera Nair', '9876543008', 'meera@example.com', '2008-06-12', 'female', '2024-07-05', 'active', 1);

-- Enrollments
INSERT INTO enrollments (member_id, program_id, group_id, fee_plan_id, institute_id, status)
VALUES
  (1, 1, 1, 1, 1, 'active'),
  (2, 1, 1, 1, 1, 'active'),
  (3, 1, 2, 1, 1, 'active'),
  (4, 1, 2, 1, 1, 'active'),
  (5, 2, 3, 1, 1, 'active'),
  (6, 2, 3, 1, 1, 'active'),
  (7, 3, 4, 1, 1, 'dropped'),
  (8, 3, 4, 1, 1, 'active');

-- Fee records (current month sample)
INSERT INTO fee_records (institute_id, member_id, enrollment_id, fee_plan_id, billing_period_label, original_amount, discount_amount, late_fee_amount, final_amount, amount_paid, due_date, status, created_by)
VALUES
  (1, 1, 1, 1, 'Oct 2026', 1500.00, 0, 0, 1500.00, 1500.00, '2026-10-05', 'paid', 1),
  (1, 2, 2, 1, 'Oct 2026', 1500.00, 0, 0, 1500.00, 1000.00, '2026-10-05', 'partially_paid', 1),
  (1, 3, 3, 1, 'Oct 2026', 1500.00, 0, 0, 1500.00, 0.00,    '2026-10-05', 'overdue', 1),
  (1, 4, 4, 1, 'Oct 2026', 1500.00, 100, 0, 1400.00, 0.00,  '2026-10-05', 'unpaid', 1),
  (1, 5, 5, 1, 'Oct 2026', 1500.00, 0, 0, 1500.00, 1500.00, '2026-10-05', 'paid', 1),
  (1, 6, 6, 1, 'Oct 2026', 1500.00, 0, 0, 1500.00, 0.00,    '2026-10-05', 'unpaid', 1),
  (1, 8, 8, 1, 'Oct 2026', 1500.00, 0, 150, 1650.00, 0.00,  '2026-10-05', 'overdue', 1);

-- Payments
INSERT INTO payments (institute_id, fee_record_id, member_id, amount, payment_method, receipt_number, payment_date, collected_by)
VALUES
  (1, 1, 1, 1500.00, 'cash',         'RCP-2026-000001', '2026-10-02', 1),
  (1, 2, 2, 1000.00, 'upi',          'RCP-2026-000002', '2026-10-03', 1),
  (1, 5, 5, 1500.00, 'bank_transfer', 'RCP-2026-000003', '2026-10-01', 2);

-- Institute settings
INSERT INTO institute_settings (institute_id, setting_key, setting_value)
VALUES
  (1, 'receipt_prefix', 'RCP'),
  (1, 'member_code_prefix', 'MEM'),
  (1, 'staff_code_prefix', 'STF'),
  (1, 'attendance_edit_window_hours', '24'),
  (1, 'financial_year_start_month', '4');
