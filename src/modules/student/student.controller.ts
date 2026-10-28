import { Router, type Request, type Response } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { sendSuccess } from '../../utils/response';
import {
  createMarksDto,
  type CreateMarksDto,
} from '../mark/mark.dto';
import * as markService from '../mark/mark.service';
import {
  createStudentDto,
  listStudentsQueryDto,
  studentIdParamDto,
  updateStudentDto,
  type CreateStudentDto,
  type ListStudentsQueryDto,
  type StudentIdParamDto,
  type UpdateStudentDto,
} from './student.dto';
import * as studentService from './student.service';

const router = Router();

router.get('/', validateQuery(listStudentsQueryDto), async (_req: Request, res: Response) => {
  const query = res.locals.query as ListStudentsQueryDto;
  sendSuccess(res, await studentService.listStudents(query), 'Students fetched successfully');
});

router.post(
  '/',
  validateBody(createStudentDto),
  async (req: Request<unknown, unknown, CreateStudentDto>, res: Response) => {
    sendSuccess(res, await studentService.createStudent(req.body), 'Student created successfully', 201);
  },
);

router.get('/:id', validateParams(studentIdParamDto), async (_req: Request, res: Response) => {
  const { id } = res.locals.params as StudentIdParamDto;
  sendSuccess(res, await studentService.getStudent(id), 'Student fetched successfully');
});

router.patch(
  '/:id',
  validateParams(studentIdParamDto),
  validateBody(updateStudentDto),
  async (req: Request, res: Response) => {
    const { id } = res.locals.params as StudentIdParamDto;
    sendSuccess(
      res,
      await studentService.updateStudent(id, req.body as UpdateStudentDto),
      'Student updated successfully',
    );
  },
);

router.delete('/:id', validateParams(studentIdParamDto), async (_req: Request, res: Response) => {
  const { id } = res.locals.params as StudentIdParamDto;
  await studentService.deleteStudent(id);
  sendSuccess(res, null, 'Student deleted successfully');
});

router.post(
  '/:id/marks',
  validateParams(studentIdParamDto),
  validateBody(createMarksDto),
  async (req: Request, res: Response) => {
    const { id } = res.locals.params as StudentIdParamDto;
    sendSuccess(
      res,
      await markService.createMarksForStudent(id, req.body as CreateMarksDto),
      'Marks created successfully',
      201,
    );
  },
);

export default router;
