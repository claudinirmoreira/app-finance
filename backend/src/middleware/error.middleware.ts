import { NextFunction, Request, Response } from 'express';
import { ValidationError, validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError';

export function validateErrors(req: Request, _res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }
  const details = result.array().reduce<Record<string, string>>((acc, err: ValidationError) => {
    if (err.type === 'field') {
      acc[err.path] = err.msg;
    }
    return acc;
  }, {});
  next(ApiError.badRequest('Dados inválidos', details));
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      message: err.message,
      errors: err.details,
    });
  }

  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}