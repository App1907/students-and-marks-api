import { Router, type Request, type Response } from 'express';
import { validateBody } from '../../middlewares/validate';
import { sendSuccess } from '../../utils/response';
import { createUserDto, updateUserDto, userIdParamDto, type CreateUserDto, type UpdateUserDto } from './user.dto';
import * as userService from './user.service';

/**
 * Controller + router for /users. Handlers translate HTTP <-> service calls.
 * No business logic and no try/catch: thrown errors and rejected promises
 * go to the central error handler. Every response goes through sendSuccess.
 */
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  sendSuccess(res, await userService.findAllUsers(), 'Users fetched successfully');
});

router.get('/:id', async (req: Request, res: Response) => {
  const { id } = userIdParamDto.parse(req.params);
  sendSuccess(res, await userService.findUserById(id), 'User fetched successfully');
});

router.post('/', validateBody(createUserDto), async (req: Request<unknown, unknown, CreateUserDto>, res: Response) => {
  sendSuccess(res, await userService.createUser(req.body), 'User created successfully', 201);
});

router.patch(
  '/:id',
  validateBody(updateUserDto),
  async (req: Request<{ id: string }, unknown, UpdateUserDto>, res: Response) => {
    const { id } = userIdParamDto.parse(req.params);
    sendSuccess(res, await userService.updateUser(id, req.body), 'User updated successfully');
  },
);

router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = userIdParamDto.parse(req.params);
  await userService.deleteUser(id);
  sendSuccess(res, null, 'User deleted successfully');
});

export default router;
