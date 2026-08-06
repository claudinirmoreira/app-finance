import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { validateErrors } from '../middleware/error.middleware';
import { serializePrisma } from '../utils/serialize';
import { categoryController } from '../controllers/category.controller';

const router = Router();

router.get(
  '/',
  query('type').optional({ values: 'falsy' }).isIn(['income', 'expense']).withMessage('Tipo inválido'),
  validateErrors,
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    res.json(serializePrisma(await categoryController.list(type)));
  })
);

router.get(
  '/:id',
  param('id').isString(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await categoryController.getById(req.params.id)));
  })
);

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
    body('type').isIn(['income', 'expense']).withMessage('Tipo inválido'),
    body('color').optional().isString(),
    body('icon').optional().isString().isLength({ max: 4 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.status(201).json(serializePrisma(await categoryController.create(req.body)));
  })
);

router.put(
  '/:id',
  [
    param('id').isString(),
    body('name').optional().trim().isLength({ min: 2 }),
    body('type').optional().isIn(['income', 'expense']),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await categoryController.update(req.params.id, req.body)));
  })
);

router.delete(
  '/:id',
  param('id').isString(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await categoryController.remove(req.params.id)));
  })
);

export default router;