import { DatabaseError } from 'pg';
import { pool } from '../../config/db';
import { conflict, notFound } from '../../errors/AppError';
import type { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.dto';
import type { UserRow } from './user.interface';

/**
 * Business logic + data access for users. Knows nothing about Express (no req/res).
 * Always use $1, $2 placeholders - never build SQL with string concatenation.
 */
const COLUMNS = 'id, name, email, created_at, updated_at';
const PG_UNIQUE_VIOLATION = '23505';

const toResponse = (row: UserRow): UserResponseDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

/** Turns a duplicate-email DB error into a 409; rethrows anything else. */
const handleDbError = (err: unknown): never => {
  if (err instanceof DatabaseError && err.code === PG_UNIQUE_VIOLATION) {
    throw conflict('A user with that email already exists');
  }
  throw err;
};

export const findAllUsers = async (): Promise<UserResponseDto[]> => {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLUMNS} FROM users ORDER BY id`);
  return rows.map(toResponse);
};

export const findUserById = async (id: number): Promise<UserResponseDto> => {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound(`User ${id} not found`);
  return toResponse(rows[0]);
};

export const createUser = async (dto: CreateUserDto): Promise<UserResponseDto> => {
  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [dto.name, dto.email],
    );
    return toResponse(rows[0]!);
  } catch (err) {
    return handleDbError(err);
  }
};

export const updateUser = async (id: number, dto: UpdateUserDto): Promise<UserResponseDto> => {
  try {
    const { rows } = await pool.query<UserRow>(
      `UPDATE users
          SET name = COALESCE($2, name),
              email = COALESCE($3, email),
              updated_at = NOW()
        WHERE id = $1
    RETURNING ${COLUMNS}`,
      [id, dto.name ?? null, dto.email ?? null],
    );
    if (!rows[0]) throw notFound(`User ${id} not found`);
    return toResponse(rows[0]);
  } catch (err) {
    return handleDbError(err);
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  if (!rowCount) throw notFound(`User ${id} not found`);
};

