import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
app.enableCors({
  origin: true,
  credentials: true,
});
  await app.listen(process.env.PORT ?? 3200);
}
bootstrap();
