import { Router, type Request, type Response } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate';
import { sendSuccess } from '../../utils/response';
import {
  averagesQueryDto,
  markIdParamDto,
  updateMarkDto,
  type AveragesQueryDto,
  type MarkIdParamDto,
  type UpdateMarkDto,
} from './mark.dto';
import * as markService from './mark.service';

const router = Router();

router.get('/averages', validateQuery(averagesQueryDto), async (_req: Request, res: Response) => {
  const query = res.locals.query as AveragesQueryDto;
  sendSuccess(res, await markService.getSubjectAverages(query), 'Subject averages fetched successfully');
});

router.get('/:id', validateParams(markIdParamDto), async (_req: Request, res: Response) => {
  const { id } = res.locals.params as MarkIdParamDto;
  sendSuccess(res, await markService.getMark(id), 'Mark fetched successfully');
});

router.patch(
  '/:id',
  validateParams(markIdParamDto),
  validateBody(updateMarkDto),
  async (req: Request, res: Response) => {
    const { id } = res.locals.params as MarkIdParamDto;
    sendSuccess(
      res,
      await markService.updateMark(id, req.body as UpdateMarkDto),
      'Mark updated successfully',
    );
  },
);

router.delete('/:id', validateParams(markIdParamDto), async (_req: Request, res: Response) => {
  const { id } = res.locals.params as MarkIdParamDto;
  await markService.deleteMark(id);
  sendSuccess(res, null, 'Mark deleted successfully');
});

export default router;
