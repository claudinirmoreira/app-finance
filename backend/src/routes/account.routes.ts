import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { validateErrors } from '../middleware/error.middleware';
import { serializePrisma } from '../utils/serialize';
import { accountController } from '../controllers/account.controller';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const accounts = await accountController.list();
    res.json(serializePrisma(accounts));
  })
);

router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    res.json(serializePrisma(await accountController.summary()));
  })
);

router.get(
  '/:id',
  param('id').isString().notEmpty(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await accountController.getById(req.params.id)));
  })
);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('type')
      .optional()
      .isIn(['checking', 'savings', 'wallet', 'credit', 'investment'])
      .withMessage('Tipo de conta inválido'),
    body('initialBalance').optional().isFloat({ min: -1000000000, max: 1000000000 }),
    body('color').optional().isString(),
    body('icon').optional().isString().isLength({ max: 4 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    const account = await accountController.create(req.body);
    res.status(201).json(serializePrisma(account));
  })
);

router.put(
  '/:id',
  [
    param('id').isString(),
    body('name').optional().trim().isLength({ min: 2 }),
    body('type').optional().isIn(['checking', 'savings', 'wallet', 'credit', 'investment']),
    body('initialBalance').optional().isFloat({ min: -1000000000, max: 1000000000 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await accountController.update(req.params.id, req.body)));
  })
);

router.delete(
  '/:id',
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await accountController.remove(req.params.id)));
  })
);

export default router;