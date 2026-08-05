import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

const budgetInclude = {
  category: { select: { id: true, name: true, icon: true, color: true, type: true } },
} satisfies Prisma.BudgetInclude;

export const budgetController = {
  async list(year?: number, month?: number) {
    return prisma.budget.findMany({
      where: year && month ? { year, month } : undefined,
      include: budgetInclude,
      orderBy: { year: 'desc' },
    });
  },

  async getById(id: string) {
    const budget = await prisma.budget.findUnique({ where: { id }, include: budgetInclude });
    if (!budget) throw ApiError.notFound('Orçamento não encontrado');
    return budget;
  },

  async create(data: { categoryId: string; amount: number; month: number; year: number }) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw ApiError.notFound('Categoria não encontrada');

    const existing = await prisma.budget.findUnique({
      where: { categoryId_month_year: { categoryId: data.categoryId, month: data.month, year: data.year } },
    });
    if (existing) {
      throw ApiError.conflict('Já existe um orçamento para esta categoria no mês selecionado');
    }

    return prisma.budget.create({
      data: {
        categoryId: category.id,
        amount: new Prisma.Decimal(data.amount),
        month: data.month,
        year: data.year,
      },
      include: budgetInclude,
    });
  },

  async update(id: string, data: { amount?: number; categoryId?: string; month?: number; year?: number }) {
    await this.getById(id);
    return prisma.budget.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.month !== undefined && { month: data.month }),
        ...(data.year !== undefined && { year: data.year }),
      },
      include: budgetInclude,
    });
  },

  async remove(id: string) {
    await this.getById(id);
    return prisma.budget.delete({ where: { id } });
  },
};