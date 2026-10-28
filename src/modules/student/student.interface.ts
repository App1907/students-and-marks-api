export type GuardianRelation = 'father' | 'mother' | 'guardian';

export interface Guardian {
  name: string;
  phone: string;
  relation: GuardianRelation;
}

/** Domain model used by services (camelCase). */
export interface Student {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  className: string;
  section: string;
  guardian: Guardian;
  createdAt: Date;
  updatedAt: Date;
}

/** Flat row as returned by pg (snake_case). */
export interface StudentRow {
  id: number;
  roll_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  class_name: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  created_at: Date;
  updated_at: Date;
}

/** Columns the repository may write on insert/update. */
export interface StudentWritableColumns {
  roll_no?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  class_name?: string;
  section?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
}

export type StudentChanges = {
  rollNo?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  className?: string;
  section?: string;
  guardian?: Guardian;
};

export interface StudentFilter {
  className?: string;
  section?: string;
  search?: string;
  limit: number;
  offset: number;
}
