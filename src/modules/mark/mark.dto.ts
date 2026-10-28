import { z } from 'zod';
import { atMostTwoDecimals, idParam, tag } from '../../utils/validators';
import { classNameSchema } from '../student/student.dto';

export const EXAMS = ['unit-1', 'midterm', 'unit-2', 'final'] as const;

const scoreSchema = atMostTwoDecimals('score').refine((value) => value >= 0, {
  message: 'score must be >= 0',
});

const maxScoreSchema = atMostTwoDecimals('maxScore')
  .refine((value) => value >= 1 && value <= 200, {
    message: 'maxScore must be between 1 and 200',
  });

const markItemSchema = z.strictObject({
  subject: tag('subject'),
  score: scoreSchema,
  maxScore: maxScoreSchema.optional().default(100),
});

export const createMarksDto = z
  .strictObject({
    exam: z.enum(EXAMS, { error: 'exam must be unit-1 | midterm | unit-2 | final' }),
    marks: z
      .array(markItemSchema, { error: 'marks must be an array' })
      .min(1, 'marks must contain at least 1 item')
      .max(15, 'marks must contain at most 15 items'),
  })
  .superRefine((body, ctx) => {
    const seen = new Set<string>();
    let duplicateSubjects = false;
    body.marks.forEach((item, index) => {
      if (item.score > item.maxScore) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks', index, 'score'],
          message: 'score must be <= maxScore',
        });
      }
      if (seen.has(item.subject)) {
        duplicateSubjects = true;
      }
      seen.add(item.subject);
    });
    if (duplicateSubjects) {
      ctx.addIssue({
        code: 'custom',
        path: ['marks'],
        message: 'subjects must be unique in the array',
      });
    }
  });
export type CreateMarksDto = z.infer<typeof createMarksDto>;

export const updateMarkDto = z
  .strictObject({
    score: scoreSchema.optional(),
    maxScore: maxScoreSchema.optional(),
  })
  .refine((body) => body.score !== undefined || body.maxScore !== undefined, {
    message: 'Provide score and/or maxScore',
  });
export type UpdateMarkDto = z.infer<typeof updateMarkDto>;

export const markIdParamDto = z.strictObject({
  id: idParam('id'),
});
export type MarkIdParamDto = z.infer<typeof markIdParamDto>;

export const averagesQueryDto = z.object({
  className: classNameSchema,

  exam: z.enum(EXAMS).optional(),
  section: z
    .string()
    .transform((value) => value.normalize('NFC').trim().toUpperCase())
    .refine((value) => /^[A-F]$/.test(value), { message: 'section must be a single letter A–F' })
    .optional(),
});
export type AveragesQueryDto = z.infer<typeof averagesQueryDto>;

export interface MarkResponseDto {
  id: number;
  studentId: number;
  exam: (typeof EXAMS)[number];
  subject: string;
  score: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAverageResponseDto {
  subject: string;
  averagePercentage: number;
  students: number;
  passed: boolean;
}
