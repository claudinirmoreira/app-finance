export function validateTransaction(data) {
  const errors = {};
  if (!data.description || data.description.trim().length < 2) {
    errors.description = 'Descrição deve ter pelo menos 2 caracteres';
  }
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    errors.amount = 'Valor deve ser maior que zero';
  }
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.type = 'Tipo inválido';
  }
  if (!data.date) {
    errors.date = 'Data é obrigatória';
  }
  if (!data.accountId) {
    errors.accountId = 'Selecione uma conta';
  }
  if (!data.categoryId) {
    errors.categoryId = 'Selecione uma categoria';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateAccount(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Nome deve ter pelo menos 2 caracteres';
  }
  if (data.initialBalance === undefined || isNaN(data.initialBalance)) {
    errors.initialBalance = 'Saldo inicial inválido';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCategory(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Nome deve ter pelo menos 2 caracteres';
  }
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.type = 'Tipo inválido';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateBudget(data) {
  const errors = {};
  if (!data.categoryId) {
    errors.categoryId = 'Selecione uma categoria';
  }
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    errors.amount = 'Valor deve ser maior que zero';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
