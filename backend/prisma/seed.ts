import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

async function main() {
  const existingAccounts = await prisma.account.count();
  if (existingAccounts > 0) {
    console.log('Banco já possui dados. Seed ignorado para não sobrescrever.');
    return;
  }

  console.log('Limpando dados existentes...');
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();

  console.log('Criando contas...');
  const accountsData = [
    { name: 'Conta Corrente', type: 'checking', initialBalance: 2500, color: '#6c5ce7', icon: '🏦' },
    { name: 'Poupança', type: 'savings', initialBalance: 12000, color: '#00b894', icon: '🐷' },
    { name: 'Carteira', type: 'wallet', initialBalance: 300, color: '#fdcb6e', icon: '👛' },
    { name: 'Cartão de Crédito', type: 'credit', initialBalance: 0, color: '#d63031', icon: '💳' },
    { name: 'Investimentos', type: 'investment', initialBalance: 8000, color: '#74b9ff', icon: '📈' },
  ] as const;

  const accounts = {};
  for (const acc of accountsData) {
    accounts[acc.name] = await prisma.account.create({ data: acc });
  }

  console.log('Criando categorias...');
  const categoriesData = [
    { name: 'Salário', type: 'income', color: '#00b894', icon: '💰' },
    { name: 'Freelance', type: 'income', color: '#55efc4', icon: '💻' },
    { name: 'Investimentos', type: 'income', color: '#74b9ff', icon: '📈' },
    { name: 'Outros Recebimentos', type: 'income', color: '#a29bfe', icon: '📥' },
    { name: 'Alimentação', type: 'expense', color: '#e17055', icon: '🍔' },
    { name: 'Moradia', type: 'expense', color: '#d63031', icon: '🏠' },
    { name: 'Transporte', type: 'expense', color: '#fdcb6e', icon: '🚗' },
    { name: 'Saúde', type: 'expense', color: '#ff7675', icon: '🏥' },
    { name: 'Educação', type: 'expense', color: '#a29bfe', icon: '📚' },
    { name: 'Lazer', type: 'expense', color: '#6c5ce7', icon: '🎮' },
    { name: 'Vestuário', type: 'expense', color: '#fd79a8', icon: '👕' },
    { name: 'Contas Fixas', type: 'expense', color: '#636e72', icon: '📄' },
    { name: 'Outros Gastos', type: 'expense', color: '#b2bec3', icon: '📦' },
  ] as const;

  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.name] = await prisma.category.create({ data: cat });
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  console.log('Criando orçamentos do mês atual...');
  const budgetsData = [
    { category: 'Alimentação', amount: 900 },
    { category: 'Transporte', amount: 350 },
    { category: 'Lazer', amount: 250 },
    { category: 'Vestuário', amount: 200 },
    { category: 'Contas Fixas', amount: 600 },
  ];
  for (const b of budgetsData) {
    await prisma.budget.create({
      data: {
        categoryId: categories[b.category].id,
        amount: new Prisma.Decimal(b.amount),
        month: currentMonth,
        year: currentYear,
      },
    });
  }

  console.log('Criando transações...');

  const seedTransactions: {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    date: Date;
    account: string;
    category: string;
    notes?: string;
  }[] = [];

  const salaries = [5850, 5850, 6100, 6100, 6100, 6400];
  for (let i = 0; i < salaries.length; i++) {
    seedTransactions.push({
      description: 'Salário mensal',
      amount: salaries[i],
      type: 'income',
      date: new Date(currentYear, i, 5),
      account: 'Conta Corrente',
      category: 'Salário',
      notes: 'Salário CLT',
    });
  }

  const freelances = [
    { amount: 1200, month: 0 },
    { amount: 800, month: 2 },
    { amount: 2000, month: 4 },
    { amount: 450, month: 5 },
  ];
  for (const f of freelances) {
    seedTransactions.push({
      description: 'Projeto freelance',
      amount: f.amount,
      type: 'income',
      date: new Date(currentYear, f.month, 15),
      account: 'Conta Corrente',
      category: 'Freelance',
      notes: 'Projeto web',
    });
  }

  seedTransactions.push({
    description: 'Dividendos',
    amount: 180.45,
    type: 'income',
    date: new Date(currentYear, 5, 20),
    account: 'Investimentos',
    category: 'Investimentos',
  });

  seedTransactions.push({
    description: 'Venda de item usado',
    amount: 320,
    type: 'income',
    date: new Date(currentYear, 4, 22),
    account: 'Carteira',
    category: 'Outros Recebimentos',
  });

  const groceries = [
    { amount: 245.8, day: 3 },
    { amount: 189.3, day: 8 },
    { amount: 312.5, day: 12 },
    { amount: 156.9, day: 17 },
    { amount: 278.4, day: 21 },
    { amount: 203.7, day: 26 },
  ];
  for (const g of groceries) {
    seedTransactions.push({
      description: 'Supermercado',
      amount: g.amount,
      type: 'expense',
      date: new Date(currentYear, 5, g.day),
      account: 'Cartão de Crédito',
      category: 'Alimentação',
    });
  }

  seedTransactions.push({
    description: 'Restaurante com amigos',
    amount: 145.9,
    type: 'expense',
    date: new Date(currentYear, 5, 14),
    account: 'Cartão de Crédito',
    category: 'Alimentação',
    notes: 'Jantar',
  });

  const rentAmount = 1450;
  for (let i = 0; i < 6; i++) {
    seedTransactions.push({
      description: 'Aluguel',
      amount: rentAmount,
      type: 'expense',
      date: new Date(currentYear, i, 10),
      account: 'Conta Corrente',
      category: 'Moradia',
    });
  }

  const utilities = [
    { name: 'Conta de luz', amount: 187.9 },
    { name: 'Conta de água', amount: 92.3 },
    { name: 'Internet', amount: 99.9 },
  ];
  for (const u of utilities) {
    seedTransactions.push({
      description: u.name,
      amount: u.amount,
      type: 'expense',
      date: new Date(currentYear, 5, 9),
      account: 'Conta Corrente',
      category: 'Contas Fixas',
    });
  }

  const transport = [
    { name: 'Combustível', amount: 150 },
    { name: 'Uber', amount: 32.5 },
    { name: 'Uber', amount: 27.9 },
    { name: 'Combustível', amount: 165 },
    { name: 'Passagem de ônibus', amount: 4.4 },
  ];
  transport.forEach((t, i) => {
    seedTransactions.push({
      description: t.name,
      amount: t.amount,
      type: 'expense',
      date: new Date(currentYear, 5, 4 + i * 5),
      account: 'Carteira',
      category: 'Transporte',
    });
  });

  const health = [
    { name: 'Farmácia', amount: 78.9 },
    { name: 'Consulta médica', amount: 250 },
    { name: 'Farmácia', amount: 45.3 },
    { name: 'Plano de saúde', amount: 320 },
  ];
  for (let i = 0; i < health.length; i++) {
    seedTransactions.push({
      description: health[i].name,
      amount: health[i].amount,
      type: 'expense',
      date: new Date(currentYear, i, 12),
      account: 'Conta Corrente',
      category: 'Saúde',
    });
  }

  const education = [
    { name: 'Curso de idiomas', amount: 249 },
    { name: 'Livros', amount: 89.9 },
    { name: 'Curso online', amount: 150 },
  ];
  education.forEach((e, i) => {
    seedTransactions.push({
      description: e.name,
      amount: e.amount,
      type: 'expense',
      date: new Date(currentYear, 3 + i, 18),
      account: 'Conta Corrente',
      category: 'Educação',
    });
  });

  const leisure = [
    { name: 'Cinema', amount: 60 },
    { name: 'Streaming', amount: 45.9 },
    { name: 'Show', amount: 180 },
    { name: 'Viagem', amount: 780 },
  ];
  leisure.forEach((l, i) => {
    seedTransactions.push({
      description: l.name,
      amount: l.amount,
      type: 'expense',
      date: new Date(currentYear, i, 20),
      account: 'Cartão de Crédito',
      category: 'Lazer',
    });
  });

  const clothing = [
    { name: 'Camisetas', amount: 89.9 },
    { name: 'Tênis', amount: 249 },
    { name: 'Calça jeans', amount: 120 },
  ];
  clothing.forEach((c, i) => {
    seedTransactions.push({
      description: c.name,
      amount: c.amount,
      type: 'expense',
      date: new Date(currentYear, i + 1, 16),
      account: 'Cartão de Crédito',
      category: 'Vestuário',
    });
  });

  const monthlyRecurring: Record<string, { amount: number; category: string; account: string }[]> = {
    'Internet 500MB': [
      { amount: 99.9, category: 'Contas Fixas', account: 'Conta Corrente' },
      { amount: 109.9, category: 'Contas Fixas', account: 'Conta Corrente' },
      { amount: 109.9, category: 'Contas Fixas', account: 'Conta Corrente' },
      { amount: 119.9, category: 'Contas Fixas', account: 'Conta Corrente' },
      { amount: 119.9, category: 'Contas Fixas', account: 'Conta Corrente' },
      { amount: 119.9, category: 'Contas Fixas', account: 'Conta Corrente' },
    ],
  };

  for (let i = 0; i < 6; i++) {
    for (const [description, entries] of Object.entries(monthlyRecurring)) {
      seedTransactions.push({
        description,
        amount: entries[i].amount,
        type: 'expense',
        date: new Date(currentYear, i, 9),
        account: entries[i].account,
        category: entries[i].category,
      });
    }
  }

  const extraSpending = [
    { description: 'Pizzaria', amount: 67.5, month: 1, day: 19, account: 'Carteira', category: 'Alimentação' },
    { description: 'Aniversário', amount: 210, month: 3, day: 25, account: 'Cartão de Crédito', category: 'Outros Gastos' },
    { description: 'Manutenção do carro', amount: 450, month: 2, day: 11, account: 'Conta Corrente', category: 'Transporte' },
    { description: 'Aplicativo de delivery', amount: 35, month: 4, day: 30, account: 'Cartão de Crédito', category: 'Alimentação' },
    { description: 'Academia', amount: 89.9, month: 0, day: 5, account: 'Conta Corrente', category: 'Saúde' },
    { description: 'Material de escritório', amount: 45, month: 5, day: 7, account: 'Conta Corrente', category: 'Outros Gastos' },
  ] as const;

  for (const e of extraSpending) {
    seedTransactions.push({
      description: e.description,
      amount: e.amount,
      type: 'expense',
      date: new Date(currentYear, e.month, e.day),
      account: e.account,
      category: e.category,
    });
  }

  const promoFreelance = [
    { description: 'Site institucional', amount: 3200, month: 1, day: 28 },
    { description: 'Manutenção de app', amount: 950, month: 3, day: 14 },
  ] as const;
  for (const f of promoFreelance) {
    seedTransactions.push({
      description: f.description,
      amount: f.amount,
      type: 'income',
      date: new Date(currentYear, f.month, f.day),
      account: 'Conta Corrente',
      category: 'Freelance',
    });
  }

  const recent = [
    { description: 'Mercadinho da esquina', amount: 58.9, daysAgo: 1, account: 'Carteira', category: 'Alimentação' },
    { description: 'Recarga de celular', amount: 30, daysAgo: 3, account: 'Carteira', category: 'Contas Fixas' },
    { description: 'Rendimento da poupança', amount: 38.6, daysAgo: 4, account: 'Poupança', category: 'Investimentos' },
    { description: 'Banca de jornal', amount: 12, daysAgo: 5, account: 'Carteira', category: 'Outros Gastos' },
    { description: 'Delivery de comida', amount: 78.4, daysAgo: 2, account: 'Cartão de Crédito', category: 'Alimentação' },
    { description: 'Netflix', amount: 55.9, daysAgo: 6, account: 'Conta Corrente', category: 'Lazer' },
  ] as const;

  for (const r of recent) {
    seedTransactions.push({
      description: r.description,
      amount: r.amount,
      type: r.category === 'Investimentos' ? 'income' : 'expense',
      date: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
      account: r.account,
      category: r.category,
    });
  }

  for (const tx of seedTransactions) {
    await prisma.transaction.create({
      data: {
        description: tx.description,
        amount: new Prisma.Decimal(tx.amount),
        type: tx.type,
        date: tx.date,
        notes: tx.notes ?? null,
        accountId: accounts[tx.account].id,
        categoryId: categories[tx.category].id,
      },
    });
  }

  const totalTx = await prisma.transaction.count();
  console.log(`Seed concluído! ${totalTx} transações, ${accountsData.length} contas, ${categoriesData.length} categorias, ${budgetsData.length} orçamentos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());