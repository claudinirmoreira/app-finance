import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

const transactionInclude = {
  account: { select: { id: true, name: true, icon: true } },
  category: { select: { id: true, name: true, icon: true, color: true, type: true } },
} satisfies Prisma.TransactionInclude;

export type TransactionInput = {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  accountId: string;
  categoryId: string;
  notes?: string;
};

export const transactionController = {
  transactionInclude,

  async list(query: {
    year?: number;
    month?: number;
    search?: string;
    type?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: Prisma.TransactionWhereInput = {};

    if (query.year && query.month) {
      const start = new Date(query.year, query.month - 1, 1);
      const end = new Date(query.year, query.month, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    if (query.type) where.type = query.type as 'income';
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async getById(id: string) {
    const tx = await prisma.transaction.findUnique({ where: { id }, include: transactionInclude });
    if (!tx) throw ApiError.notFound('Transação não encontrada');
    return tx;
  },

  async create(data: TransactionInput) {
    const [account, category] = await Promise.all([
      prisma.account.findUnique({ where: { id: data.accountId } }),
      prisma.category.findUnique({ where: { id: data.categoryId } }),
    ]);
    if (!account) throw ApiError.notFound('Conta não encontrada');
    if (!category) throw ApiError.notFound('Categoria não encontrada');
    if (category.type !== data.type) {
      throw ApiError.badRequest('A categoria deve ter o mesmo tipo da transação');
    }

    return prisma.transaction.create({
      data: {
        description: data.description.trim(),
        amount: new Prisma.Decimal(data.amount),
        type: data.type,
        date: new Date(data.date),
        notes: data.notes,
        accountId: account.id,
        categoryId: category.id,
      },
      include: transactionInclude,
    });
  },

  async update(id: string, data: Partial<TransactionInput>) {
    await this.getById(id);
    if (data.accountId || data.categoryId) {
      const accountId = data.accountId ?? null;
      const categoryId = data.categoryId ?? null;
      const type = data.type ?? null;
      const current = await prisma.transaction.findUnique({ where: { id } });
      if (accountId) {
        const account = await prisma.account.findUnique({ where: { id: accountId } });
        if (!account) throw ApiError.notFound('Conta não encontrada');
      }
      if (categoryId) {
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) throw ApiError.notFound('Categoria não encontrada');
        if (type && category.type !== type) {
          throw ApiError.badRequest('A categoria deve ter o mesmo tipo da transação');
        }
        if (!type && current && category.type !== current.type) {
          throw ApiError.badRequest('A categoria deve ter o mesmo tipo da transação');
        }
      }
    }

    return prisma.transaction.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: transactionInclude,
    });
  },

  async remove(id: string) {
    await this.getById(id);
    return prisma.transaction.delete({ where: { id } });
  },
};