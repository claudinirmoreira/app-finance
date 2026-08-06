import { Router } from 'express';
import { query } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { validateErrors } from '../middleware/error.middleware';
import { serializePrisma } from '../utils/serialize';
import { reportController } from '../controllers/report.controller';

const router = Router();

const monthQuery = [
  query('year').isInt({ min: 2000, max: 2100 }).withMessage('Ano inválido'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('Mês inválido'),
];

router.get(
  '/summary',
  monthQuery,
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(
      serializePrisma(
        await reportController.summary(Number(req.query.year), Number(req.query.month))
      )
    );
  })
);

router.get(
  '/category-totals',
  monthQuery,
  query('type').optional({ values: 'falsy' }).isIn(['income', 'expense']),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(
      serializePrisma(
        await reportController.categoryTotals(
          Number(req.query.year),
          Number(req.query.month),
          req.query.type as string | undefined
        )
      )
    );
  })
);

router.get(
  '/daily',
  monthQuery,
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(
      serializePrisma(
        await reportController.daily(Number(req.query.year), Number(req.query.month))
      )
    );
  })
);

router.get(
  '/monthly',
  query('year').isInt({ min: 2000, max: 2100 }),
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(serializePrisma(await reportController.monthlyTotals(Number(req.query.year))));
  })
);

router.get(
  '/account-balances',
  asyncHandler(async (_req, res) => {
    res.json(serializePrisma(await reportController.accountBalances()));
  })
);

router.get(
  '/budget-ratios',
  monthQuery,
  validateErrors,
  asyncHandler(async (req, res) => {
    res.json(
      serializePrisma(
        await reportController.budgetRatios(Number(req.query.year), Number(req.query.month))
      )
    );
  })
);

export default router;