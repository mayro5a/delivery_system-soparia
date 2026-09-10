import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`🍲 API da Soparia da Lê rodando em http://localhost:${env.port}`);
});
