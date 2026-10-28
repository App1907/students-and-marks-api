export type Exam = 'unit-1' | 'midterm' | 'unit-2' | 'final';

/** Domain model used by services (camelCase). */
export interface Mark {
  id: number;
  studentId: number;
  exam: Exam;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Flat row as returned by pg. NUMERIC columns arrive as strings. */
export interface MarkRow {
  id: number;
  student_id: number;
  exam: string;
  subject: string;
  score: string;
  max_score: string;
  created_at: Date;
  updated_at: Date;
}

export interface MarkWritableColumns {
  student_id?: number;
  exam?: string;
  subject?: string;
  score?: number;
  max_score?: number;
}

export type MarkChanges = {
  score?: number;
  maxScore?: number;
};

export interface MarkInput {
  subject: string;
  score: number;
  maxScore: number;
}

export interface SubjectAverage {
  subject: string;
  averagePercentage: number;
  students: number;
}

export interface SubjectAverageFilter {
  className: string;
  exam?: Exam;
  section?: string;
}
