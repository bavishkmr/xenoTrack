-- ============================================================
-- Xenotrack Institute Management System
-- Supabase (PostgreSQL) Schema v1.0
-- ============================================================

-- Helper functions for MySQL compatibility
CREATE OR REPLACE FUNCTION CURDATE()
RETURNS DATE AS $$
BEGIN
  RETURN CURRENT_DATE;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION DATEDIFF(date1 ANYELEMENT, date2 ANYELEMENT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (date1::date - date2::date);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------
-- 1. institutes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutes (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  logo_url      VARCHAR(500),
  address       TEXT,
  phone         VARCHAR(20),
  email         VARCHAR(150),
  timezone      VARCHAR(60)  NOT NULL DEFAULT 'Asia/Kolkata',
  currency      VARCHAR(10)  NOT NULL DEFAULT 'INR',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  institute_id    INTEGER NOT NULL,
  email           VARCHAR(150) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  full_name       VARCHAR(150) NOT NULL,
  phone           VARCHAR(20),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_email_institute UNIQUE (institute_id, email),
  CONSTRAINT fk_users_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 3. refresh_tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_refresh_token UNIQUE (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. staff_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_profiles (
  id                            SERIAL PRIMARY KEY,
  user_id                       INTEGER NOT NULL,
  institute_id                  INTEGER NOT NULL,
  staff_code                    VARCHAR(30)  NOT NULL,
  designation                   VARCHAR(100),
  joining_date                  DATE,
  can_collect_fees              BOOLEAN      NOT NULL DEFAULT FALSE,
  can_edit_attendance           BOOLEAN      NOT NULL DEFAULT TRUE,
  attendance_edit_window_hours  INTEGER      NOT NULL DEFAULT 24,
  status                        VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes                         TEXT,
  created_at                    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_staff_code_institute UNIQUE (institute_id, staff_code),
  CONSTRAINT uq_staff_user UNIQUE (user_id),
  CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 5. fee_plans
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_plans (
  id                    SERIAL PRIMARY KEY,
  institute_id          INTEGER NOT NULL,
  name                  VARCHAR(150) NOT NULL,
  description           TEXT,
  amount                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  frequency             VARCHAR(30) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one_time','weekly','monthly','quarterly','half_yearly','yearly','custom')),
  due_day               SMALLINT,
  late_fee_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  late_fee_after_days   INTEGER       NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_type         VARCHAR(20)   NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('flat','percentage')),
  status                VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fp_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 6. programs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id                  SERIAL PRIMARY KEY,
  institute_id        INTEGER NOT NULL,
  name                VARCHAR(150) NOT NULL,
  description         TEXT,
  program_type        VARCHAR(100),
  default_fee_plan_id INTEGER,
  status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prog_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_prog_fee_plan FOREIGN KEY (default_fee_plan_id) REFERENCES fee_plans(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 7. "groups" (quoted because GROUPS is reserved in PostgreSQL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "groups" (
  id              SERIAL PRIMARY KEY,
  institute_id    INTEGER NOT NULL,
  program_id      INTEGER NOT NULL,
  name            VARCHAR(150) NOT NULL,
  start_date      DATE,
  end_date        DATE,
  scheduled_days  JSONB,
  start_time      TIME,
  end_time        TIME,
  capacity        INTEGER,
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_grp_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_grp_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 8. group_staff_assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_staff_assignments (
  id               SERIAL PRIMARY KEY,
  group_id         INTEGER NOT NULL,
  staff_profile_id INTEGER NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_gsa UNIQUE (group_id, staff_profile_id),
  CONSTRAINT fk_gsa_group FOREIGN KEY (group_id) REFERENCES "groups"(id) ON DELETE CASCADE,
  CONSTRAINT fk_gsa_staff FOREIGN KEY (staff_profile_id) REFERENCES staff_profiles(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 9. members
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                SERIAL PRIMARY KEY,
  institute_id      INTEGER NOT NULL,
  member_code       VARCHAR(30) NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  dob               DATE,
  gender            VARCHAR(30) CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  address           TEXT,
  emergency_contact VARCHAR(200),
  profile_photo     VARCHAR(500),
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status            VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','completed')),
  notes             TEXT,
  created_by        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_member_code_institute UNIQUE (institute_id, member_code),
  CONSTRAINT fk_mem_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mem_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_member_name ON members(full_name);
CREATE INDEX IF NOT EXISTS idx_member_phone ON members(phone);

-- ------------------------------------------------------------
-- 10. enrollments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           SERIAL PRIMARY KEY,
  institute_id INTEGER NOT NULL,
  member_id    INTEGER NOT NULL,
  program_id   INTEGER NOT NULL,
  group_id     INTEGER,
  fee_plan_id  INTEGER,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status       VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','dropped')),
  notes        TEXT,
  CONSTRAINT uq_enrollment UNIQUE (member_id, program_id, group_id),
  CONSTRAINT fk_enr_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enr_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enr_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enr_group FOREIGN KEY (group_id) REFERENCES "groups"(id) ON DELETE SET NULL,
  CONSTRAINT fk_enr_fee_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 11. fee_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_records (
  id                    SERIAL PRIMARY KEY,
  institute_id          INTEGER NOT NULL,
  member_id             INTEGER NOT NULL,
  enrollment_id         INTEGER,
  fee_plan_id           INTEGER,
  billing_period_label  VARCHAR(100),
  original_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  late_fee_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  final_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  outstanding_balance   DECIMAL(12,2) GENERATED ALWAYS AS (final_amount - amount_paid) STORED,
  due_date              DATE,
  status                VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partially_paid','paid','overdue','waived')),
  notes                 TEXT,
  created_by            INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fr_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fr_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fr_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
  CONSTRAINT fk_fr_fee_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE SET NULL,
  CONSTRAINT fk_fr_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_fr_member ON fee_records(member_id);
CREATE INDEX IF NOT EXISTS idx_fr_due_date ON fee_records(due_date);
CREATE INDEX IF NOT EXISTS idx_fr_status ON fee_records(status);

-- ------------------------------------------------------------
-- 12. payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                    SERIAL PRIMARY KEY,
  institute_id          INTEGER NOT NULL,
  fee_record_id         INTEGER NOT NULL,
  member_id             INTEGER NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  payment_method        VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','upi','card','other')),
  transaction_reference VARCHAR(200),
  receipt_number        VARCHAR(50) NOT NULL,
  payment_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by          INTEGER NOT NULL,
  notes                 TEXT,
  is_reversed           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_receipt_number_institute UNIQUE (institute_id, receipt_number),
  CONSTRAINT fk_pay_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_fee_record FOREIGN KEY (fee_record_id) REFERENCES fee_records(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_collected_by FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_pay_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_pay_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_pay_collected_by ON payments(collected_by);

-- ------------------------------------------------------------
-- 13. payment_reversals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_reversals (
  id           SERIAL PRIMARY KEY,
  payment_id   INTEGER NOT NULL,
  reversed_by  INTEGER NOT NULL,
  reason       TEXT,
  reversed_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pr_reversed_by FOREIGN KEY (reversed_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 14. attendance_sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id            SERIAL PRIMARY KEY,
  institute_id  INTEGER NOT NULL,
  group_id      INTEGER NOT NULL,
  session_date  DATE NOT NULL,
  start_time    TIME,
  end_time      TIME,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  notes         TEXT,
  created_by    INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_session_group_date UNIQUE (group_id, session_date),
  CONSTRAINT fk_as_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_as_group FOREIGN KEY (group_id) REFERENCES "groups"(id) ON DELETE RESTRICT,
  CONSTRAINT fk_as_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_as_date ON attendance_sessions(session_date);

-- ------------------------------------------------------------
-- 15. attendance_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL,
  member_id   INTEGER NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'absent' CHECK (status IN ('present','absent','late','excused')),
  note        VARCHAR(255),
  marked_by   INTEGER NOT NULL,
  marked_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_by INTEGER,
  modified_at TIMESTAMPTZ,
  CONSTRAINT uq_ar_session_member UNIQUE (session_id, member_id),
  CONSTRAINT fk_ar_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ar_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ar_modified_by FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_member ON attendance_records(member_id);

-- ------------------------------------------------------------
-- 16. activity_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id           SERIAL PRIMARY KEY,
  institute_id INTEGER NOT NULL,
  user_id      INTEGER,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(60),
  entity_id    INTEGER,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_al_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_al_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_al_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_al_created_at ON activity_logs(created_at);

-- ------------------------------------------------------------
-- 17. institute_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institute_settings (
  id            SERIAL PRIMARY KEY,
  institute_id  INTEGER NOT NULL,
  setting_key   VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_by    INTEGER,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_setting UNIQUE (institute_id, setting_key),
  CONSTRAINT fk_is_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  CONSTRAINT fk_is_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

