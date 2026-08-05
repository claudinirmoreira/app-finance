import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

const accountInclude = {
  _count: { select: { transactions: true } },
} satisfies Prisma.AccountInclude;

async function getBalance(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { transactions: true },
  });
  if (!account) return null;

  let balance = account.initialBalance.toNumber();
  for (const tx of account.transactions) {
    balance += tx.type === 'income' ? tx.amount.toNumber() : -tx.amount.toNumber();
  }
  return balance;
}

export const accountController = {
  async list() {
    const accounts = await prisma.account.findMany({
      include: accountInclude,
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      accounts.map(async (a) => ({
        ...a,
        balance: await getBalance(a.id),
      }))
    );
  },

  async getById(id: string) {
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) throw ApiError.notFound('Conta não encontrada');
    return { ...account, balance: await getBalance(id) };
  },

  async create(data: { name: string; type?: string; initialBalance?: number; color?: string; icon?: string }) {
    const existing = await prisma.account.findFirst({
      where: { name: { equals: data.name.trim(), mode: 'insensitive' } },
    });
    if (existing) throw ApiError.conflict('Já existe uma conta com este nome');

    return prisma.account.create({
      data: {
        name: data.name.trim(),
        type: data.type as 'checking',
        initialBalance: new Prisma.Decimal(data.initialBalance ?? 0),
        color: data.color,
        icon: data.icon,
      },
      include: accountInclude,
    });
  },

  async update(id: string, data: { name?: string; type?: string; initialBalance?: number; color?: string; icon?: string }) {
    await this.getById(id);
    return prisma.account.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.type !== undefined && { type: data.type as 'checking' }),
        ...(data.initialBalance !== undefined && {
          initialBalance: new Prisma.Decimal(data.initialBalance),
        }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
      },
      include: accountInclude,
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.transaction.deleteMany({ where: { accountId: id } });
    return prisma.account.delete({ where: { id } });
  },

  async summary() {
    const [accounts, totals] = await Promise.all([
      prisma.account.findMany({ include: { transactions: true } }),
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
      }),
    ]);

    let totalBalance = 0;
    for (const a of accounts) {
      totalBalance += a.initialBalance.toNumber();
      for (const tx of a.transactions) {
        totalBalance += tx.type === 'income' ? tx.amount.toNumber() : -tx.amount.toNumber();
      }
    }

    const income = totals.find((t) => t.type === 'income')?._sum.amount?.toNumber() ?? 0;
    const expense = totals.find((t) => t.type === 'expense')?._sum.amount?.toNumber() ?? 0;

    return { totalBalance, income, expense, count: accounts.length };
  },
};
