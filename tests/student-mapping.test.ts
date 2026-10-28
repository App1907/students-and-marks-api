import { describe, expect, it } from 'vitest';
import { toAverageResponseDto } from '../src/modules/mark/mark.service';
import * as markRepository from '../src/modules/mark/mark.repository';
import type { Mark, MarkRow } from '../src/modules/mark/mark.interface';
import * as studentRepository from '../src/modules/student/student.repository';
import type { StudentRow } from '../src/modules/student/student.interface';

const studentRow: StudentRow = {
  id: 1,
  roll_no: '2026-10A-017',
  first_name: 'Asha',
  last_name: 'Sharma',
  date_of_birth: new Date('2012-05-15T00:00:00.000Z'),
  class_name: '10',
  section: 'A',
  guardian_name: 'Ravi Kumar',
  guardian_phone: '+919876543210',
  guardian_relation: 'father',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
};

const markRow: MarkRow = {
  id: 9,
  student_id: 1,
  exam: 'final',
  subject: 'maths',
  score: '78.50',
  max_score: '100.00',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
};

describe('student mapping', () => {
  it('toDomain nests guardian fields', () => {
    const student = studentRepository.toDomain(studentRow);
    expect(student.guardian).toEqual({
      name: 'Ravi Kumar',
      phone: '+919876543210',
      relation: 'father',
    });
    expect(student.rollNo).toBe('2026-10A-017');
    expect(student.dateOfBirth).toBeInstanceOf(Date);
  });

  it('toPersistence flattens guardian and supports partial updates', () => {
    const partial = studentRepository.toPersistence({
      firstName: 'Neha',
      guardian: { name: 'Sita', phone: '+911234567890', relation: 'mother' },
    });

    expect(partial).toEqual({
      first_name: 'Neha',
      guardian_name: 'Sita',
      guardian_phone: '+911234567890',
      guardian_relation: 'mother',
    });
    expect(partial).not.toHaveProperty('roll_no');
    expect(partial).not.toHaveProperty('last_name');
  });

  it('throws on unknown guardian_relation', () => {
    expect(() =>
      studentRepository.toDomain({ ...studentRow, guardian_relation: 'uncle' }),
    ).toThrow(/Unknown guardian_relation/);
  });

  it('round-trips domain → persistence columns → domain without loss of mapped fields', () => {
    const domain = studentRepository.toDomain(studentRow);
    const columns = studentRepository.toPersistence({
      rollNo: domain.rollNo,
      firstName: domain.firstName,
      lastName: domain.lastName,
      dateOfBirth: '2012-05-15',
      className: domain.className,
      section: domain.section,
      guardian: domain.guardian,
    });

    const rebuilt = studentRepository.toDomain({
      ...studentRow,
      roll_no: columns.roll_no!,
      first_name: columns.first_name!,
      last_name: columns.last_name!,
      class_name: columns.class_name!,
      section: columns.section!,
      guardian_name: columns.guardian_name!,
      guardian_phone: columns.guardian_phone!,
      guardian_relation: columns.guardian_relation!,
    });

    expect(rebuilt.rollNo).toBe(domain.rollNo);
    expect(rebuilt.guardian).toEqual(domain.guardian);
    expect(rebuilt.className).toBe(domain.className);
  });
});

describe('mark mapping', () => {
  it('toDomain converts NUMERIC strings to numbers', () => {
    const mark = markRepository.toDomain(markRow);
    expect(mark.score).toBe(78.5);
    expect(mark.maxScore).toBe(100);
    expect(typeof mark.score).toBe('number');
  });

  it('toDomain throws on invalid NUMERIC string', () => {
    expect(() => markRepository.toDomain({ ...markRow, score: 'not-a-number' })).toThrow(
      /Invalid NUMERIC/,
    );
  });

  it('toPersistence maps camelCase to snake_case', () => {
    expect(
      markRepository.toPersistence({
        studentId: 1,
        exam: 'midterm',
        subject: 'english',
        score: 12.5,
        maxScore: 50,
      }),
    ).toEqual({
      student_id: 1,
      exam: 'midterm',
      subject: 'english',
      score: 12.5,
      max_score: 50,
    });
  });

  it('partial mark update maps only present fields', () => {
    expect(markRepository.toPersistence({ score: 88 })).toEqual({ score: 88 });
    expect(markRepository.toPersistence({ maxScore: 50 })).toEqual({ max_score: 50 });
  });

  it('round-trips mark domain ↔ row', () => {
    const domain: Mark = markRepository.toDomain(markRow);
    const columns = markRepository.toPersistence(domain);
    const again = markRepository.toDomain({
      ...markRow,
      student_id: columns.student_id!,
      exam: columns.exam!,
      subject: columns.subject!,
      score: String(columns.score),
      max_score: String(columns.max_score),
    });
    expect(again).toMatchObject({
      studentId: domain.studentId,
      exam: domain.exam,
      subject: domain.subject,
      score: domain.score,
      maxScore: domain.maxScore,
    });
  });
});

describe('averages pass/fail (service)', () => {
  it('marks passed when averagePercentage >= PASS_PERCENTAGE', () => {
    const passed = toAverageResponseDto(
      { subject: 'maths', averagePercentage: 72.356, students: 31 },
      40,
    );
    expect(passed.averagePercentage).toBe(72.36);
    expect(passed.passed).toBe(true);

    const failed = toAverageResponseDto(
      { subject: 'english', averagePercentage: 33.333, students: 10 },
      40,
    );
    expect(failed.averagePercentage).toBe(33.33);
    expect(failed.passed).toBe(false);
  });
});
