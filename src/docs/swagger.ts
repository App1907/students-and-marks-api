import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Students & Marks API',
    version: '1.0.0',
    description:
      'School records API: students with nested guardians, atomic marks intake, and subject averages with pass/fail.',
  },
  servers: [{ url: '/api', description: 'API base path' }],
  tags: [{ name: 'Health' }, { name: 'Students' }, { name: 'Marks' }, { name: 'Users' }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        responses: { '200': { description: 'Server is healthy' } },
      },
    },
    '/students': {
      get: {
        tags: ['Students'],
        summary: 'List students',
        parameters: [
          { name: 'className', in: 'query', schema: { type: 'string' } },
          { name: 'section', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'List of students' }, '400': { description: 'Validation failed' } },
      },
      post: {
        tags: ['Students'],
        summary: 'Create a student (nested guardian)',
        responses: {
          '201': { description: 'Student created' },
          '400': { description: 'Validation failed' },
          '409': { description: 'Duplicate rollNo' },
        },
      },
    },
    '/students/{id}': {
      get: {
        tags: ['Students'],
        summary: 'Get student by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Student found' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Students'],
        summary: 'Partial update (guardian replaced whole when sent)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Updated' },
          '400': { description: 'Validation failed' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Students'],
        summary: 'Delete student (cascades marks)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/students/{id}/marks': {
      post: {
        tags: ['Marks'],
        summary: 'Create marks for a student (atomic transaction)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '201': { description: 'Marks created' },
          '400': { description: 'Validation failed' },
          '404': { description: 'Student not found' },
          '409': { description: 'Duplicate student/exam/subject' },
        },
      },
    },
    '/marks/averages': {
      get: {
        tags: ['Marks'],
        summary: 'Subject averages with pass/fail from PASS_PERCENTAGE',
        parameters: [
          { name: 'className', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'exam', in: 'query', schema: { type: 'string' } },
          { name: 'section', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Averages' }, '400': { description: 'Validation failed' } },
      },
    },
    '/marks/{id}': {
      get: {
        tags: ['Marks'],
        summary: 'Get mark by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Mark found' }, '404': { description: 'Not found' } },
      },
      patch: {
        tags: ['Marks'],
        summary: 'Update score and/or maxScore',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Updated' },
          '400': { description: 'Validation / score > maxScore' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Marks'],
        summary: 'Delete a mark',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
};
