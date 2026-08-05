import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

const categoryInclude = {
  _count: { select: { transactions: true, budgets: true } },
} as const;

export const categoryController = {
  async list(type?: string) {
    return prisma.category.findMany({
      where: type ? { type: type as 'income' } : undefined,
      include: categoryInclude,
      orderBy: { name: 'asc' },
    });
  },

  async getById(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw ApiError.notFound('Categoria não encontrada');
    return category;
  },

  async create(data: { name: string; type: string; color?: string; icon?: string }) {
    const existing = await prisma.category.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' } },
    });
    if (existing) throw ApiError.conflict('Já existe uma categoria com este nome');

    return prisma.category.create({
      data: {
        name: data.name.trim(),
        type: data.type as 'income',
        color: data.color,
        icon: data.icon,
      },
      include: categoryInclude,
    });
  },

  async update(id: string, data: { name?: string; type?: string; color?: string; icon?: string }) {
    await this.getById(id);
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.type !== undefined && { type: data.type as 'income' }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
      },
      include: categoryInclude,
    });
  },

  async remove(id: string) {
    const category = await this.getById(id);
    const txCount = await prisma.transaction.count({ where: { categoryId: id } });
    if (txCount > 0) {
      throw ApiError.conflict('Não é possível excluir: existem transações vinculadas');
    }
    await prisma.budget.deleteMany({ where: { categoryId: id } });
    return prisma.category.delete({ where: { id: category.id } });
  },
};