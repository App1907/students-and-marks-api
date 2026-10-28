import { DatabaseError } from 'pg';
import { pool } from '../../config/db';
import { conflict, notFound } from '../../errors/AppError';
import type {
  Exam,
  Mark,
  MarkChanges,
  MarkInput,
  MarkRow,
  MarkWritableColumns,
  SubjectAverage,
  SubjectAverageFilter,
} from './mark.interface';

const COLUMNS = `
  id, student_id, exam, subject, score, max_score, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

const EXAMS = new Set<Exam>(['unit-1', 'midterm', 'unit-2', 'final']);
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const toNumber = (raw: string | number, field: string): number => {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid NUMERIC value for ${field}: ${String(raw)}`);
  }
  return value;
};

/** Map a DB row → domain Mark. NUMERIC strings become numbers. */
export const toDomain = (row: MarkRow): Mark => {
  if (!EXAMS.has(row.exam as Exam)) {
    throw new Error(`Unknown exam: ${row.exam}`);
  }

  return {
    id: row.id,
    studentId: row.student_id,
    exam: row.exam as Exam,
    subject: row.subject,
    score: toNumber(row.score, 'score'),
    maxScore: toNumber(row.max_score, 'max_score'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toPersistence = (
  mark: Partial<{ studentId: number; exam: Exam; subject: string; score: number; maxScore: number }>,
): MarkWritableColumns => {
  const columns: MarkWritableColumns = {};
  if (mark.studentId !== undefined) columns.student_id = mark.studentId;
  if (mark.exam !== undefined) columns.exam = mark.exam;
  if (mark.subject !== undefined) columns.subject = mark.subject;
  if (mark.score !== undefined) columns.score = mark.score;
  if (mark.maxScore !== undefined) columns.max_score = mark.maxScore;
  return columns;
};

const translateError = (err: unknown, studentId?: number): never => {
  if (err instanceof DatabaseError) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw conflict('A mark for this student, exam and subject already exists');
    }
    if (err.code === PG_FOREIGN_KEY_VIOLATION) {
      throw notFound(`Student ${studentId ?? 'unknown'} not found`);
    }
  }
  throw err;
};

export const findById = async (id: number): Promise<Mark | null> => {
  const { rows } = await pool.query<MarkRow>(`SELECT ${COLUMNS} FROM marks WHERE id = $1`, [id]);
  return rows[0] ? toDomain(rows[0]) : null;
};

/**
 * Insert many marks for one student+exam in a single transaction.
 * Either all rows are saved or none are.
 */
export const insertMany = async (
  studentId: number,
  exam: Exam,
  marks: MarkInput[],
): Promise<Mark[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created: Mark[] = [];

    for (const item of marks) {
      const { rows } = await client.query<MarkRow>(
        `INSERT INTO marks (student_id, exam, subject, score, max_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [studentId, exam, item.subject, item.score, item.maxScore],
      );
      created.push(toDomain(rows[0]!));
    }

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    return translateError(err, studentId);
  } finally {
    client.release();
  }
};

export const update = async (id: number, changes: MarkChanges): Promise<Mark | null> => {
  const data = toPersistence(changes);
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  for (const [column, value] of Object.entries(data)) {
    if (value === undefined) continue;
    sets.push(`${column} = $${i++}`);
    values.push(value);
  }

  if (sets.length === 0) return findById(id);

  sets.push('updated_at = NOW()');
  values.push(id);

  try {
    const { rows } = await pool.query<MarkRow>(
      `UPDATE marks SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  } catch (err) {
    return translateError(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const { rowCount } = await pool.query('DELETE FROM marks WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
};

/**
 * AVG(score / max_score * 100) grouped by subject, joined to students.
 */
export const subjectAverages = async (filter: SubjectAverageFilter): Promise<SubjectAverage[]> => {
  const values: unknown[] = [filter.className];
  const conditions = ['s.class_name = $1'];
  let i = 2;

  if (filter.exam !== undefined) {
    conditions.push(`m.exam = $${i++}`);
    values.push(filter.exam);
  }
  if (filter.section !== undefined) {
    conditions.push(`s.section = $${i++}`);
    values.push(filter.section);
  }

  const { rows } = await pool.query<{
    subject: string;
    average_percentage: string;
    students: string | number;
  }>(
    `SELECT
       m.subject,
       AVG(m.score / NULLIF(m.max_score, 0) * 100) AS average_percentage,
       COUNT(*)::int AS students
     FROM marks m
     INNER JOIN students s ON s.id = m.student_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY m.subject
     ORDER BY m.subject ASC`,
    values,
  );

  return rows.map((row) => ({
    subject: row.subject,
    averagePercentage: toNumber(row.average_percentage, 'average_percentage'),
    students: Number(row.students),
  }));
};
