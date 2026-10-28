import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/modules/student/student.repository', () => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toDomain: vi.fn(),
  toPersistence: vi.fn(),
}));

vi.mock('../src/modules/mark/mark.repository', () => ({
  findById: vi.fn(),
  insertMany: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  subjectAverages: vi.fn(),
  toDomain: vi.fn(),
  toPersistence: vi.fn(),
}));

import app from '../src/app';
import * as markRepository from '../src/modules/mark/mark.repository';
import * as studentRepository from '../src/modules/student/student.repository';

const validGuardian = {
  name: 'Ravi Kumar',
  phone: '+919876543210',
  relation: 'father',
};

const validStudent = {
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Sharma',
  dateOfBirth: '2012-05-15',
  className: '10',
  section: 'A',
  guardian: validGuardian,
};

const repoSpies = () => ({
  studentInsert: studentRepository.insert as ReturnType<typeof vi.fn>,
  studentUpdate: studentRepository.update as ReturnType<typeof vi.fn>,
  studentFindMany: studentRepository.findMany as ReturnType<typeof vi.fn>,
  studentFindById: studentRepository.findById as ReturnType<typeof vi.fn>,
  markInsertMany: markRepository.insertMany as ReturnType<typeof vi.fn>,
  markUpdate: markRepository.update as ReturnType<typeof vi.fn>,
  markFindById: markRepository.findById as ReturnType<typeof vi.fn>,
  markAverages: markRepository.subjectAverages as ReturnType<typeof vi.fn>,
});

const expectReposUntouched = () => {
  const spies = repoSpies();
  for (const spy of Object.values(spies)) {
    expect(spy).not.toHaveBeenCalled();
  }
};

describe('Student & Marks validation / sanitisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('malicious payloads (must be rejected before repository)', () => {
    // 1. SQL injection — if accepted, attacker could break out of a quoted SQL literal.
    it('rejects SQL injection in rollNo', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, rollNo: "2026-10A-017' OR '1'='1" });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/rollNo/);
      expectReposUntouched();
    });

    // 2. Stored XSS — script tags in a top-level name would be persisted and later rendered.
    it('rejects stored XSS in firstName', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, firstName: '<script>alert(1)</script>' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/firstName/);
      expectReposUntouched();
    });

    // 3. Nested XSS — guardian.name is a nested object field that must be sanitised too.
    it('rejects XSS hidden inside nested guardian', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({
          ...validStudent,
          guardian: { ...validGuardian, name: '<img src=x onerror=alert(1)>' },
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/guardian\.name/);
      expectReposUntouched();
    });

    // 4. Prototype pollution — __proto__ could alter Object.prototype for the process.
    it('rejects prototype pollution via __proto__', async () => {
      // Must send raw JSON: JSON.stringify drops __proto__ on plain objects.
      const payload = JSON.stringify({
        ...validStudent,
        guardian: validGuardian,
      }).replace(/\}$/, ',"__proto__":{"admin":true}}');

      const res = await request(app)
        .post('/api/students')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/__proto__|payload|Forbidden/i);
      expectReposUntouched();
    });

    // 5. Mass assignment — client must not set id / createdAt themselves.
    it('rejects mass assignment of id and createdAt', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, id: 999, createdAt: '2000-01-01T00:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/id|createdAt/);
      expectReposUntouched();
    });

    // 6. Type confusion — object where a string is expected bypasses naive typeof checks.
    it('rejects type confusion (object for firstName)', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, firstName: { $gt: '' } });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/firstName/);
      expectReposUntouched();
    });

    // 7. Oversized array — 1000 marks could exhaust memory / DB transaction limits.
    it('rejects an oversized marks array', async () => {
      const marks = Array.from({ length: 1000 }, (_, i) => ({
        subject: `subj-${i}`,
        score: 10,
        maxScore: 100,
      }));

      const res = await request(app)
        .post('/api/students/1/marks')
        .send({ exam: 'final', marks });

      expect(res.status).toBe(413);
      expectReposUntouched();
    });

    // 8. Invalid value inside one marks[] item — score > maxScore must not be stored.
    it('rejects invalid score inside one marks[] item', async () => {
      const res = await request(app)
        .post('/api/students/1/marks')
        .send({
          exam: 'final',
          marks: [{ subject: 'maths', score: 120, maxScore: 100 }],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/marks\.0\.score/);
      expectReposUntouched();
    });

    // 9. Control characters / null byte — can truncate C strings or hide payloads in logs.
    it('rejects null byte / control characters in lastName', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, lastName: 'Sha\u0000rma' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/lastName/);
      expectReposUntouched();
    });

    // 10. Looks valid but impossible — Feb 30 is not a real date; must not become a DB date.
    it('rejects impossible dateOfBirth', async () => {
      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, dateOfBirth: '2026-02-30' });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/dateOfBirth/);
      expectReposUntouched();
    });
  });

  describe('additional edge cases', () => {
    it('rejects a 2-year-old student (looks valid, out of age range)', async () => {
      const today = new Date();
      const y = today.getFullYear() - 2;
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');

      const res = await request(app)
        .post('/api/students')
        .send({ ...validStudent, dateOfBirth: `${y}-${m}-${d}` });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/dateOfBirth|age/i);
      expectReposUntouched();
    });

    it('rejects duplicate subjects in marks[]', async () => {
      const res = await request(app)
        .post('/api/students/1/marks')
        .send({
          exam: 'final',
          marks: [
            { subject: 'maths', score: 10, maxScore: 100 },
            { subject: 'maths', score: 20, maxScore: 100 },
          ],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/marks/);
      expectReposUntouched();
    });

    it('rejects score sent as a string (type confusion)', async () => {
      const res = await request(app)
        .post('/api/students/1/marks')
        .send({
          exam: 'final',
          marks: [{ subject: 'maths', score: '80', maxScore: 100 }],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/marks\.0\.score/);
      expectReposUntouched();
    });

    it('rejects out-of-range list query params without hitting the repository', async () => {
      const badClass = await request(app).get('/api/students?className=13');
      expect(badClass.status).toBe(400);
      expect(JSON.stringify(badClass.body.details)).toMatch(/className/);

      const badSection = await request(app).get('/api/students?section=Z');
      expect(badSection.status).toBe(400);
      expect(JSON.stringify(badSection.body.details)).toMatch(/section/);

      const badLimit = await request(app).get('/api/students?limit=100000');
      expect(badLimit.status).toBe(400);
      expect(JSON.stringify(badLimit.body.details)).toMatch(/limit/);

      expectReposUntouched();
    });

    it('requires className on averages and ignores unknown query keys', async () => {
      const missing = await request(app).get('/api/marks/averages');
      expect(missing.status).toBe(400);
      expect(JSON.stringify(missing.body.details)).toMatch(/className/);
      expect(markRepository.subjectAverages).not.toHaveBeenCalled();

      (markRepository.subjectAverages as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const ok = await request(app).get('/api/marks/averages?className=7&foo=bar');
      expect(ok.status).toBe(200);
      expect(markRepository.subjectAverages).toHaveBeenCalledWith(
        expect.objectContaining({ className: '7' }),
      );
    });

    it('rejects mark update when merged score would exceed maxScore (service rule)', async () => {
      (markRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        studentId: 1,
        exam: 'final',
        subject: 'maths',
        score: 90,
        maxScore: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app).patch('/api/marks/1').send({ maxScore: 50 });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/score/);
      expect(markRepository.update).not.toHaveBeenCalled();
    });

    it('rejects score with more than 2 decimal places', async () => {
      const res = await request(app)
        .post('/api/students/1/marks')
        .send({
          exam: 'midterm',
          marks: [{ subject: 'maths', score: 80.123, maxScore: 100 }],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/marks\.0\.score/);
      expectReposUntouched();
    });

    it('rejects constructor prototype pollution key', async () => {
      const payload = JSON.stringify({
        ...validStudent,
        guardian: validGuardian,
      }).replace(/\}$/, ',"constructor":{"prototype":{"admin":true}}}');

      const res = await request(app)
        .post('/api/students')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/constructor|payload|Forbidden/i);
      expectReposUntouched();
    });

    it('defaults omitted maxScore to 100 then rejects score above it', async () => {
      const res = await request(app)
        .post('/api/students/1/marks')
        .send({
          exam: 'final',
          marks: [{ subject: 'science', score: 120 }],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.details)).toMatch(/marks\.0\.score/);
      expectReposUntouched();
    });
  });

  describe('positive sanitisation', () => {
    it('normalises rollNo, phone, relation and className before repository', async () => {
      const insert = studentRepository.insert as ReturnType<typeof vi.fn>;
      insert.mockResolvedValue({
        id: 1,
        rollNo: '2026-10A-017',
        firstName: 'Asha',
        lastName: 'Sharma',
        dateOfBirth: new Date('2012-05-15T00:00:00.000Z'),
        className: '7',
        section: 'A',
        guardian: { name: 'Ravi Kumar', phone: '+919876543210', relation: 'mother' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/students')
        .send({
          ...validStudent,
          rollNo: '  2026-10a-017 ',
          className: 7,
          guardian: {
            name: 'Ravi Kumar',
            phone: '+91 98765-43210',
            relation: 'Mother',
          },
        });

      expect(res.status).toBe(201);
      expect(insert).toHaveBeenCalledTimes(1);
      const arg = insert.mock.calls[0]![0];
      expect(arg.rollNo).toBe('2026-10A-017');
      expect(arg.className).toBe('7');
      expect(arg.guardian.phone).toBe('+919876543210');
      expect(arg.guardian.relation).toBe('mother');
    });
  });
});
