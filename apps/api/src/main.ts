import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpApp } from './configure-app';
import { AppConfigService } from './config/app-config.service';
import { RedisService } from './redis/redis.service';
import { AppIoAdapter } from './realtime/app-io.adapter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureHttpApp(app);

  const config = app.get(AppConfigService);
  const redis = app.get(RedisService);
  const ioAdapter = new AppIoAdapter(app, config, redis);
  await ioAdapter.connectToRedis();
  app.useWebSocketAdapter(ioAdapter);

  await app.listen(config.port);
  logger.log(`Jackaroo API listening on http://localhost:${config.port}`);
  logger.log(`Allowed web origin: ${config.webOrigin}`);
}

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', error);
  process.exit(1);
});
