import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { validateErrors } from '../middleware/error.middleware';
import { serializePrisma } from '../utils/serialize';
import { transactionController } from '../controllers/transaction.controller';

const router = Router();

router.get(
  '/',
  [
    query('year').optional().isInt({ min: 2000, max: 2100 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('search').optional().isString(),
    query('type').optional().isIn(['income', 'expense']),
    query('categoryId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    const data = await transactionController.list({
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      search: req.query.search as string | undefined,
      type: req.query.type as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(serializePrisma(data));
  })
);

router.get(
  '/:id',
  param('id').isString(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await transactionController.getById(req.params.id)));
  })
);

router.post(
  '/',
  [
    body('description').trim().isLength({ min: 2 }).withMessage('Descrição deve ter pelo menos 2 caracteres'),
    body('amount').isFloat({ gt: 0 }).withMessage('Valor deve ser maior que zero'),
    body('type').isIn(['income', 'expense']).withMessage('Tipo inválido'),
    body('date').isISO8601().withMessage('Data inválida'),
    body('accountId').isString().withMessage('Conta obrigatória'),
    body('categoryId').isString().withMessage('Categoria obrigatória'),
    body('notes').optional().isString().isLength({ max: 500 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.status(201).json(serializePrisma(await transactionController.create(req.body)));
  })
);

router.put(
  '/:id',
  [
    param('id').isString(),
    body('description').optional().trim().isLength({ min: 2 }),
    body('amount').optional().isFloat({ gt: 0 }),
    body('type').optional().isIn(['income', 'expense']),
    body('date').optional().isISO8601(),
    body('accountId').optional().isString(),
    body('categoryId').optional().isString(),
    body('notes').optional().isString().isLength({ max: 500 }),
  ],
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await transactionController.update(req.params.id, req.body)));
  })
);

router.delete(
  '/:id',
  param('id').isString(),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await transactionController.remove(req.params.id)));
  })
);

export default router;