import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { loadApiEnv } from '@rajyarank/config/env';

// Given "https://rajyarank.com" (or "https://www.rajyarank.com"), returns
// both the bare and www-prefixed origins so CORS accepts either host.
function withWwwVariants(url: string): string[] {
  const u = new URL(url);
  const bareHost = u.host.replace(/^www\./, '');
  return [`${u.protocol}//${bareHost}`, `${u.protocol}//www.${bareHost}`];
}

async function bootstrap() {
  const env = loadApiEnv();
  // rawBody: true exposes req.rawBody for HMAC verification of the Razorpay webhook.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1', { exclude: ['healthz', 'readyz'] });
  // CORS allow-list is driven entirely by per-environment public URLs.
  // Amplify serves the web app on both the bare apex and the www subdomain
  // with no redirect between them (both resolve live, independently), so
  // WEB_PUBLIC_URL alone only ever allowlists one — the other origin's
  // fetches get silently CORS-blocked by the browser (reproduced: student
  // login fails end-to-end on whichever host isn't WEB_PUBLIC_URL).
  app.enableCors({
    origin: [...withWwwVariants(env.WEB_PUBLIC_URL), env.ADMIN_PUBLIC_URL],
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
}

bootstrap().catch((err) => {
  // Deliberately print only the message (e.g. "Invalid environment
  // configuration: - DATABASE_URL: Required"), not the full stack trace —
  // a misconfigured deployment should fail with a short, readable reason,
  // not a wall of internal Node.js frames. process.exit(1) makes sure the
  // container/process manager sees this as a real failure, not a hang.
  console.error(`Failed to start: ${err.message}`);
  process.exit(1);
});
