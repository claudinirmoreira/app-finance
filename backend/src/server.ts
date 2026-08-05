import { createApp } from './app';
import { PORT } from './config/env';
import { prisma } from './lib/prisma';

async function main() {
  const app = createApp();

  try {
    await prisma.$connect();
    console.log('Conectado ao banco de dados');
  } catch (err) {
    console.error('Não foi possível conectar ao banco de dados', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
  });
}

main();

function shutdown() {
  prisma.$disconnect().finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);