import { DatabaseError } from 'pg';
import { pool } from '../../config/db';
import { conflict } from '../../errors/AppError';
import { escapeLike } from '../../utils/validators';
import type {
  Student,
  StudentChanges,
  StudentFilter,
  StudentRow,
  StudentWritableColumns,
  GuardianRelation,
} from './student.interface';

const COLUMNS = `
  id, roll_no, first_name, last_name, date_of_birth, class_name, section,
  guardian_name, guardian_phone, guardian_relation, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

const GUARDIAN_RELATIONS = new Set<GuardianRelation>(['father', 'mother', 'guardian']);
const PG_UNIQUE_VIOLATION = '23505';

/** Map a DB row → domain Student. Rows never leave this file. */
export const toDomain = (row: StudentRow): Student => {
  if (!GUARDIAN_RELATIONS.has(row.guardian_relation as GuardianRelation)) {
    throw new Error(`Unknown guardian_relation: ${row.guardian_relation}`);
  }

  return {
    id: row.id,
    rollNo: row.roll_no,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth instanceof Date ? row.date_of_birth : new Date(row.date_of_birth),
    className: row.class_name,
    section: row.section.trim(),
    guardian: {
      name: row.guardian_name,
      phone: row.guardian_phone,
      relation: row.guardian_relation as GuardianRelation,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/** Map domain changes → writable snake_case columns (partial-safe). */
export const toPersistence = (changes: StudentChanges): StudentWritableColumns => {
  const columns: StudentWritableColumns = {};

  if (changes.rollNo !== undefined) columns.roll_no = changes.rollNo;
  if (changes.firstName !== undefined) columns.first_name = changes.firstName;
  if (changes.lastName !== undefined) columns.last_name = changes.lastName;
  if (changes.dateOfBirth !== undefined) columns.date_of_birth = changes.dateOfBirth;
  if (changes.className !== undefined) columns.class_name = changes.className;
  if (changes.section !== undefined) columns.section = changes.section;
  if (changes.guardian !== undefined) {
    columns.guardian_name = changes.guardian.name;
    columns.guardian_phone = changes.guardian.phone;
    columns.guardian_relation = changes.guardian.relation;
  }

  return columns;
};

const translateError = (err: unknown): never => {
  if (err instanceof DatabaseError && err.code === PG_UNIQUE_VIOLATION) {
    throw conflict('A student with that rollNo already exists');
  }
  throw err;
};

export const findMany = async (filter: StudentFilter): Promise<Student[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (filter.className !== undefined) {
    conditions.push(`class_name = $${i++}`);
    values.push(filter.className);
  }
  if (filter.section !== undefined) {
    conditions.push(`section = $${i++}`);
    values.push(filter.section);
  }
  if (filter.search !== undefined) {
    const pattern = `%${escapeLike(filter.search)}%`;
    conditions.push(
      `(roll_no ILIKE $${i} ESCAPE '\\' OR first_name ILIKE $${i} ESCAPE '\\' OR last_name ILIKE $${i} ESCAPE '\\')`,
    );
    values.push(pattern);
    i += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(filter.limit, filter.offset);

  const { rows } = await pool.query<StudentRow>(
    `SELECT ${COLUMNS} FROM students ${where}
     ORDER BY id ASC
     LIMIT $${i++} OFFSET $${i}`,
    values,
  );
  return rows.map(toDomain);
};

export const findById = async (id: number): Promise<Student | null> => {
  const { rows } = await pool.query<StudentRow>(
    `SELECT ${COLUMNS} FROM students WHERE id = $1`,
    [id],
  );
  return rows[0] ? toDomain(rows[0]) : null;
};

export const insert = async (input: StudentChanges): Promise<Student> => {
  const data = toPersistence(input);
  try {
    const { rows } = await pool.query<StudentRow>(
      `INSERT INTO students (
         roll_no, first_name, last_name, date_of_birth, class_name, section,
         guardian_name, guardian_phone, guardian_relation
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING ${COLUMNS}`,
      [
        data.roll_no,
        data.first_name,
        data.last_name,
        data.date_of_birth,
        data.class_name,
        data.section,
        data.guardian_name,
        data.guardian_phone,
        data.guardian_relation,
      ],
    );
    return toDomain(rows[0]!);
  } catch (err) {
    return translateError(err);
  }
};

export const update = async (id: number, changes: StudentChanges): Promise<Student | null> => {
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
    const { rows } = await pool.query<StudentRow>(
      `UPDATE students SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  } catch (err) {
    return translateError(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const { rowCount } = await pool.query('DELETE FROM students WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
};
