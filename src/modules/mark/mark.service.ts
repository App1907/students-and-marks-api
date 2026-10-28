import { env } from '../../config/env';
import { badRequest, notFound } from '../../errors/AppError';
import * as studentRepository from '../student/student.repository';
import type {
  AveragesQueryDto,
  CreateMarksDto,
  MarkResponseDto,
  SubjectAverageResponseDto,
  UpdateMarkDto,
} from './mark.dto';
import type { Mark, SubjectAverage } from './mark.interface';
import * as markRepository from './mark.repository';

export const toResponseDto = (mark: Mark): MarkResponseDto => ({
  id: mark.id,
  studentId: mark.studentId,
  exam: mark.exam,
  subject: mark.subject,
  score: mark.score,
  maxScore: mark.maxScore,
  createdAt: mark.createdAt.toISOString(),
  updatedAt: mark.updatedAt.toISOString(),
});

/** Round to 2 decimals and attach pass/fail from PASS_PERCENTAGE. */
export const toAverageResponseDto = (
  average: SubjectAverage,
  passPercentage: number = env.PASS_PERCENTAGE,
): SubjectAverageResponseDto => {
  const averagePercentage = Math.round(average.averagePercentage * 100) / 100;
  return {
    subject: average.subject,
    averagePercentage,
    students: average.students,
    passed: averagePercentage >= passPercentage,
  };
};

export const createMarksForStudent = async (
  studentId: number,
  dto: CreateMarksDto,
): Promise<MarkResponseDto[]> => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw notFound(`Student ${studentId} not found`);

  const created = await markRepository.insertMany(
    studentId,
    dto.exam,
    dto.marks.map((item) => ({
      subject: item.subject,
      score: item.score,
      maxScore: item.maxScore,
    })),
  );
  return created.map(toResponseDto);
};

export const updateMark = async (id: number, dto: UpdateMarkDto): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);

  const score = dto.score ?? existing.score;
  const maxScore = dto.maxScore ?? existing.maxScore;
  if (score > maxScore) {
    throw badRequest('score must be <= maxScore', { score: ['score must be <= maxScore'] });
  }

  const updated = await markRepository.update(id, {
    score: dto.score,
    maxScore: dto.maxScore,
  });
  if (!updated) throw notFound(`Mark ${id} not found`);
  return toResponseDto(updated);
};

export const deleteMark = async (id: number): Promise<void> => {
  const deleted = await markRepository.remove(id);
  if (!deleted) throw notFound(`Mark ${id} not found`);
};

export const getMark = async (id: number): Promise<MarkResponseDto> => {
  const mark = await markRepository.findById(id);
  if (!mark) throw notFound(`Mark ${id} not found`);
  return toResponseDto(mark);
};

export const getSubjectAverages = async (
  query: AveragesQueryDto,
): Promise<SubjectAverageResponseDto[]> => {
  const averages = await markRepository.subjectAverages({
    className: query.className,
    exam: query.exam,
    section: query.section,
  });
  return averages.map((row) => toAverageResponseDto(row));
};
