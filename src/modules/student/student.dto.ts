import { z } from 'zod';
import { idParam, pagination, personName, safeText } from '../../utils/validators';

const ROLL_NO = /^\d{4}-\d{1,2}[A-F]-\d{3}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const GUARDIAN_RELATIONS = ['father', 'mother', 'guardian'] as const;

const isRealDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
};

const ageInYears = (isoDate: string, today = new Date()): number => {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  let age = today.getFullYear() - y;
  const monthDelta = today.getMonth() + 1 - m;
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < d)) age -= 1;
  return age;
};

const rollNoSchema = safeText('rollNo', 1, 32)
  .transform((value) => value.toUpperCase())
  .refine((value) => ROLL_NO.test(value), {
    message: 'rollNo must match YYYY-#X-### (e.g. 2026-10A-017)',
  });

/** Accepts JSON number 7 or string "7"; always outputs "1".."12". */
export const classNameSchema = z
  .union([
    z.number({ error: 'className must be a number or string' }).int(),
    z.string({ error: 'className must be a number or string' }),
  ])
  .transform((value) => String(value).trim())
  .refine((value) => /^(1[0-2]|[1-9])$/.test(value), {
    message: 'className must be between 1 and 12',
  });

const sectionSchema = safeText('section', 1, 1)
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-F]$/.test(value), {
    message: 'section must be a single letter A–F',
  });

const dateOfBirthSchema = z
  .string({ error: 'dateOfBirth must be a string' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
  .refine(isRealDate, { message: 'dateOfBirth must be a real calendar date' })
  .refine((value) => {
    const age = ageInYears(value);
    return age >= 3 && age <= 25;
  }, { message: 'student age must be between 3 and 25 years' });

const guardianSchema = z.strictObject({
  name: personName('guardian.name'),
  phone: z
    .string({ error: 'guardian.phone must be a string' })
    .transform((value) => value.normalize('NFC').trim().replace(/[\s-]/g, ''))
    .refine((value) => !/[\u0000-\u001F\u007F<>]/.test(value), {
      message: 'guardian.phone contains forbidden characters',
    })
    .refine((value) => E164.test(value), {
      message: 'guardian.phone must be E.164 (e.g. +919876543210)',
    }),
  relation: z
    .string({ error: 'guardian.relation must be a string' })
    .transform((value) => value.normalize('NFC').trim().toLowerCase())
    .refine((value) => !/[\u0000-\u001F\u007F<>]/.test(value), {
      message: 'guardian.relation contains forbidden characters',
    })
    .refine((value): value is (typeof GUARDIAN_RELATIONS)[number] =>
      (GUARDIAN_RELATIONS as readonly string[]).includes(value), {
      message: 'guardian.relation must be father, mother, or guardian',
    }),
});

export const createStudentDto = z.strictObject({
  rollNo: rollNoSchema,
  firstName: personName('firstName'),
  lastName: personName('lastName'),
  dateOfBirth: dateOfBirthSchema,
  className: classNameSchema,
  section: sectionSchema,
  guardian: guardianSchema,
});
export type CreateStudentDto = z.infer<typeof createStudentDto>;

export const updateStudentDto = z
  .strictObject({
    rollNo: rollNoSchema.optional(),
    firstName: personName('firstName').optional(),
    lastName: personName('lastName').optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    className: classNameSchema.optional(),
    section: sectionSchema.optional(),
    guardian: guardianSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;

export const studentIdParamDto = z.strictObject({
  id: idParam('id'),
});
export type StudentIdParamDto = z.infer<typeof studentIdParamDto>;

export const listStudentsQueryDto = z.object({
  className: classNameSchema.optional(),
  section: sectionSchema.optional(),
  search: safeText('search', 1, 100).optional(),
  limit: pagination.shape.limit,
  offset: pagination.shape.offset,
});
export type ListStudentsQueryDto = z.infer<typeof listStudentsQueryDto>;

export interface StudentResponseDto {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  className: string;
  section: string;
  guardian: {
    name: string;
    phone: string;
    relation: (typeof GUARDIAN_RELATIONS)[number];
  };
  createdAt: string;
  updatedAt: string;
}
