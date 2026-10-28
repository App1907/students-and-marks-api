/** Internal shape of a user inside the app (not exposed directly to clients). */
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A user as stored in data/users.json (dates as ISO strings). */
export interface UserRecord {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/** Shape of the whole data/users.json file. */
export interface UserStore {
  nextId: number;
  users: UserRecord[];
}

/** A row from the `users` table, as returned by pg (snake_case columns). */
export interface UserRow {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}
