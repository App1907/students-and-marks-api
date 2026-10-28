CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS students;

CREATE TABLE students (
  id                 SERIAL PRIMARY KEY,
  roll_no            VARCHAR(32)  NOT NULL UNIQUE,
  first_name         VARCHAR(100) NOT NULL,
  last_name          VARCHAR(100) NOT NULL,
  date_of_birth      DATE         NOT NULL,
  class_name         VARCHAR(2)   NOT NULL,
  section            CHAR(1)      NOT NULL,
  guardian_name      VARCHAR(100) NOT NULL,
  guardian_phone     VARCHAR(20)  NOT NULL,
  guardian_relation  VARCHAR(20)  NOT NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT students_class_name_check CHECK (class_name ~ '^(1[0-2]|[1-9])$'),
  CONSTRAINT students_section_check CHECK (section ~ '^[A-F]$'),
  CONSTRAINT students_guardian_relation_check
    CHECK (guardian_relation IN ('father', 'mother', 'guardian'))
);

CREATE TABLE marks (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam        VARCHAR(20)  NOT NULL,
  subject     VARCHAR(50)  NOT NULL,
  score       NUMERIC(5,2) NOT NULL,
  max_score   NUMERIC(5,2) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT marks_exam_check CHECK (exam IN ('unit-1', 'midterm', 'unit-2', 'final')),
  CONSTRAINT marks_score_range CHECK (score >= 0 AND score <= max_score),
  CONSTRAINT marks_max_score_range CHECK (max_score >= 1 AND max_score <= 200),
  CONSTRAINT marks_student_exam_subject_unique UNIQUE (student_id, exam, subject)
);

CREATE INDEX IF NOT EXISTS idx_students_class_section ON students (class_name, section);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks (student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks (subject);
