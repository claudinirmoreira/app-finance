import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { validateErrors } from '../middleware/error.middleware';
import { serializePrisma } from '../utils/serialize';
import { budgetController } from '../controllers/budget.controller';

const router = Router();

router.get(
  '/',
  [
    query('year').optional().isInt({ min: 2000, max: 2100 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    res.json(serializePrisma(await budgetController.list(year, month)));
  })
);

router.get(
  '/:id',
  param('id').isString(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await budgetController.getById(req.params.id)));
  })
);

router.post(
  '/',
  [
    body('categoryId').isString(),
    body('amount').isFloat({ gt: 0 }).withMessage('Valor deve ser maior que zero'),
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2000, max: 2100 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.status(201).json(serializePrisma(await budgetController.create(req.body)));
  })
);

router.put(
  '/:id',
  [
    param('id').isString(),
    body('amount').optional().isFloat({ gt: 0 }),
    body('month').optional().isInt({ min: 1, max: 12 }),
    body('year').optional().isInt({ min: 2000, max: 2100 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await budgetController.update(req.params.id, req.body)));
  })
);

router.delete(
  '/:id',
  param('id').isString(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await budgetController.remove(req.params.id)));
  })
);

export default router;