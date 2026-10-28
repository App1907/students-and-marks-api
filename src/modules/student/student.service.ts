import { notFound } from '../../errors/AppError';
import type {
  CreateStudentDto,
  ListStudentsQueryDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './student.dto';
import type { Student } from './student.interface';
import * as studentRepository from './student.repository';

/**
 * pg returns DATE as a JS Date at local midnight. Using toISOString() would
 * shift the calendar day in positive UTC offsets — use local components.
 */
const toDateString = (value: Date): string => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return String(value).slice(0, 10);
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const toResponseDto = (student: Student): StudentResponseDto => ({
  id: student.id,
  rollNo: student.rollNo,
  firstName: student.firstName,
  lastName: student.lastName,
  dateOfBirth: toDateString(student.dateOfBirth),
  className: student.className,
  section: student.section,
  guardian: { ...student.guardian },
  createdAt: student.createdAt.toISOString(),
  updatedAt: student.updatedAt.toISOString(),
});

export const listStudents = async (query: ListStudentsQueryDto): Promise<StudentResponseDto[]> => {
  const students = await studentRepository.findMany({
    className: query.className,
    section: query.section,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  });
  return students.map(toResponseDto);
};

export const getStudent = async (id: number): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponseDto(student);
};

export const createStudent = async (dto: CreateStudentDto): Promise<StudentResponseDto> => {
  const student = await studentRepository.insert({
    rollNo: dto.rollNo,
    firstName: dto.firstName,
    lastName: dto.lastName,
    dateOfBirth: dto.dateOfBirth,
    className: dto.className,
    section: dto.section,
    guardian: dto.guardian,
  });
  return toResponseDto(student);
};

export const updateStudent = async (
  id: number,
  dto: UpdateStudentDto,
): Promise<StudentResponseDto> => {
  const student = await studentRepository.update(id, {
    rollNo: dto.rollNo,
    firstName: dto.firstName,
    lastName: dto.lastName,
    dateOfBirth: dto.dateOfBirth,
    className: dto.className,
    section: dto.section,
    guardian: dto.guardian,
  });
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponseDto(student);
};

export const deleteStudent = async (id: number): Promise<void> => {
  const deleted = await studentRepository.remove(id);
  if (!deleted) throw notFound(`Student ${id} not found`);
};
