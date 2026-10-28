-- ============================================================
-- Xenotrack Institute Management System
-- MySQL Schema v1.0
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ------------------------------------------------------------
-- 1. institutes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  logo_url      VARCHAR(500),
  address       TEXT,
  phone         VARCHAR(20),
  email         VARCHAR(150),
  timezone      VARCHAR(60)  NOT NULL DEFAULT 'Asia/Kolkata',
  currency      VARCHAR(10)  NOT NULL DEFAULT 'INR',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT UNSIGNED NOT NULL,
  email           VARCHAR(150) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  full_name       VARCHAR(150) NOT NULL,
  phone           VARCHAR(20),
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  last_login      DATETIME,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_email_institute (institute_id, email),
  CONSTRAINT fk_users_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. refresh_tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_token (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. staff_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_profiles (
  id                            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id                       INT UNSIGNED NOT NULL,
  institute_id                  INT UNSIGNED NOT NULL,
  staff_code                    VARCHAR(30)  NOT NULL,
  designation                   VARCHAR(100),
  joining_date                  DATE,
  can_collect_fees              TINYINT(1)   NOT NULL DEFAULT 0,
  can_edit_attendance           TINYINT(1)   NOT NULL DEFAULT 1,
  attendance_edit_window_hours  INT UNSIGNED NOT NULL DEFAULT 24,
  status                        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  notes                         TEXT,
  created_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_code_institute (institute_id, staff_code),
  UNIQUE KEY uq_staff_user (user_id),
  CONSTRAINT fk_sp_user        FOREIGN KEY (user_id)       REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_sp_institute   FOREIGN KEY (institute_id)  REFERENCES institutes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. programs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id        INT UNSIGNED NOT NULL,
  name                VARCHAR(150) NOT NULL,
  description         TEXT,
  program_type        VARCHAR(100),
  default_fee_plan_id INT UNSIGNED,
  status              ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prog_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. fee_plans
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_plans (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id          INT UNSIGNED NOT NULL,
  name                  VARCHAR(150) NOT NULL,
  description           TEXT,
  amount                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  frequency             ENUM('one_time','weekly','monthly','quarterly','half_yearly','yearly','custom') NOT NULL DEFAULT 'monthly',
  due_day               TINYINT UNSIGNED,
  late_fee_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  late_fee_after_days   INT UNSIGNED  NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_type         ENUM('flat','percentage') NOT NULL DEFAULT 'flat',
  status                ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fp_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE programs
  ADD CONSTRAINT fk_prog_fee_plan FOREIGN KEY (default_fee_plan_id) REFERENCES fee_plans(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 7. `groups` (backtick because GROUP is reserved)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id    INT UNSIGNED NOT NULL,
  program_id      INT UNSIGNED NOT NULL,
  name            VARCHAR(150) NOT NULL,
  start_date      DATE,
  end_date        DATE,
  scheduled_days  JSON,
  start_time      TIME,
  end_time        TIME,
  capacity        SMALLINT UNSIGNED,
  status          ENUM('active','inactive','completed') NOT NULL DEFAULT 'active',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_grp_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_grp_program   FOREIGN KEY (program_id)   REFERENCES programs(id)   ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8. group_staff_assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_staff_assignments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id         INT UNSIGNED NOT NULL,
  staff_profile_id INT UNSIGNED NOT NULL,
  is_primary       TINYINT(1)   NOT NULL DEFAULT 0,
  assigned_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gsa (group_id, staff_profile_id),
  CONSTRAINT fk_gsa_group FOREIGN KEY (group_id)         REFERENCES `groups`(id)      ON DELETE CASCADE,
  CONSTRAINT fk_gsa_staff FOREIGN KEY (staff_profile_id) REFERENCES staff_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 9. members
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id      INT UNSIGNED NOT NULL,
  member_code       VARCHAR(30)  NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  dob               DATE,
  gender            ENUM('male','female','other','prefer_not_to_say'),
  address           TEXT,
  emergency_contact VARCHAR(200),
  profile_photo     VARCHAR(500),
  registration_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
  status            ENUM('active','inactive','suspended','completed') NOT NULL DEFAULT 'active',
  notes             TEXT,
  created_by        INT UNSIGNED,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member_code_institute (institute_id, member_code),
  INDEX idx_member_name  (full_name),
  INDEX idx_member_phone (phone),
  CONSTRAINT fk_mem_institute  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_mem_created_by FOREIGN KEY (created_by)   REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 10. enrollments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id INT UNSIGNED NOT NULL,
  member_id    INT UNSIGNED NOT NULL,
  program_id   INT UNSIGNED NOT NULL,
  group_id     INT UNSIGNED,
  fee_plan_id  INT UNSIGNED,
  enrolled_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status       ENUM('active','completed','dropped') NOT NULL DEFAULT 'active',
  notes        TEXT,
  UNIQUE KEY uq_enrollment (member_id, program_id, group_id),
  CONSTRAINT fk_enr_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enr_member    FOREIGN KEY (member_id)    REFERENCES members(id)    ON DELETE RESTRICT,
  CONSTRAINT fk_enr_program   FOREIGN KEY (program_id)   REFERENCES programs(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_enr_group     FOREIGN KEY (group_id)     REFERENCES `groups`(id)   ON DELETE SET NULL,
  CONSTRAINT fk_enr_fee_plan  FOREIGN KEY (fee_plan_id)  REFERENCES fee_plans(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 11. fee_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_records (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id          INT UNSIGNED  NOT NULL,
  member_id             INT UNSIGNED  NOT NULL,
  enrollment_id         INT UNSIGNED,
  fee_plan_id           INT UNSIGNED,
  billing_period_label  VARCHAR(100),
  original_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  late_fee_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  final_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  outstanding_balance   DECIMAL(12,2) GENERATED ALWAYS AS (final_amount - amount_paid) STORED,
  due_date              DATE,
  status                ENUM('unpaid','partially_paid','paid','overdue','waived') NOT NULL DEFAULT 'unpaid',
  notes                 TEXT,
  created_by            INT UNSIGNED,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fr_member   (member_id),
  INDEX idx_fr_due_date (due_date),
  INDEX idx_fr_status   (status),
  CONSTRAINT fk_fr_institute   FOREIGN KEY (institute_id) REFERENCES institutes(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_fr_member      FOREIGN KEY (member_id)    REFERENCES members(id)     ON DELETE RESTRICT,
  CONSTRAINT fk_fr_enrollment  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL,
  CONSTRAINT fk_fr_fee_plan    FOREIGN KEY (fee_plan_id)  REFERENCES fee_plans(id)   ON DELETE SET NULL,
  CONSTRAINT fk_fr_created_by  FOREIGN KEY (created_by)   REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 12. payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id          INT UNSIGNED  NOT NULL,
  fee_record_id         INT UNSIGNED  NOT NULL,
  member_id             INT UNSIGNED  NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  payment_method        ENUM('cash','bank_transfer','upi','card','other') NOT NULL DEFAULT 'cash',
  transaction_reference VARCHAR(200),
  receipt_number        VARCHAR(50)   NOT NULL,
  payment_date          DATE          NOT NULL DEFAULT (CURRENT_DATE),
  collected_by          INT UNSIGNED  NOT NULL,
  notes                 TEXT,
  is_reversed           TINYINT(1)    NOT NULL DEFAULT 0,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_receipt_number_institute (institute_id, receipt_number),
  INDEX idx_pay_member      (member_id),
  INDEX idx_pay_date        (payment_date),
  INDEX idx_pay_collected_by (collected_by),
  CONSTRAINT fk_pay_institute     FOREIGN KEY (institute_id)  REFERENCES institutes(id)  ON DELETE RESTRICT,
  CONSTRAINT fk_pay_fee_record    FOREIGN KEY (fee_record_id) REFERENCES fee_records(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pay_member        FOREIGN KEY (member_id)     REFERENCES members(id)     ON DELETE RESTRICT,
  CONSTRAINT fk_pay_collected_by  FOREIGN KEY (collected_by)  REFERENCES users(id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 13. payment_reversals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_reversals (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id   INT UNSIGNED NOT NULL,
  reversed_by  INT UNSIGNED NOT NULL,
  reason       TEXT,
  reversed_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_payment     FOREIGN KEY (payment_id)  REFERENCES payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pr_reversed_by FOREIGN KEY (reversed_by) REFERENCES users(id)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 14. attendance_sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id  INT UNSIGNED NOT NULL,
  group_id      INT UNSIGNED NOT NULL,
  session_date  DATE         NOT NULL,
  start_time    TIME,
  end_time      TIME,
  status        ENUM('pending','completed') NOT NULL DEFAULT 'pending',
  notes         TEXT,
  created_by    INT UNSIGNED NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session_group_date (group_id, session_date),
  INDEX idx_as_date (session_date),
  CONSTRAINT fk_as_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_as_group     FOREIGN KEY (group_id)     REFERENCES `groups`(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_as_created_by FOREIGN KEY (created_by)  REFERENCES users(id)      ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 15. attendance_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  INT UNSIGNED NOT NULL,
  member_id   INT UNSIGNED NOT NULL,
  status      ENUM('present','absent','late','excused') NOT NULL DEFAULT 'absent',
  note        VARCHAR(255),
  marked_by   INT UNSIGNED NOT NULL,
  marked_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_by INT UNSIGNED,
  modified_at DATETIME,
  UNIQUE KEY uq_ar_session_member (session_id, member_id),
  INDEX idx_ar_member (member_id),
  CONSTRAINT fk_ar_session     FOREIGN KEY (session_id)  REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_member      FOREIGN KEY (member_id)   REFERENCES members(id)             ON DELETE RESTRICT,
  CONSTRAINT fk_ar_marked_by   FOREIGN KEY (marked_by)   REFERENCES users(id)               ON DELETE RESTRICT,
  CONSTRAINT fk_ar_modified_by FOREIGN KEY (modified_by) REFERENCES users(id)               ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 16. activity_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(60),
  entity_id    INT UNSIGNED,
  old_values   JSON,
  new_values   JSON,
  ip_address   VARCHAR(45),
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_user        (user_id),
  INDEX idx_al_entity      (entity_type, entity_id),
  INDEX idx_al_created_at  (created_at),
  CONSTRAINT fk_al_institute FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_al_user      FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 17. institute_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institute_settings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institute_id  INT UNSIGNED NOT NULL,
  setting_key   VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_by    INT UNSIGNED,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_setting (institute_id, setting_key),
  CONSTRAINT fk_is_institute  FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
  CONSTRAINT fk_is_updated_by FOREIGN KEY (updated_by)   REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
