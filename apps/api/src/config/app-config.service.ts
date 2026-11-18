import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env';

@Injectable()
export class AppConfigService {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly port: number;
  readonly webOrigin: string;
  readonly apiPublicUrl: string | undefined;
  readonly databaseUrl: string;
  readonly redisUrl: string | undefined;
  readonly jwtSecret: string;
  readonly jwtExpiresDays: number;
  readonly cookieSecure: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.nodeEnv = config.get('NODE_ENV', { infer: true });
    this.port = config.get('API_PORT', { infer: true });
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
    this.apiPublicUrl = config.get('API_PUBLIC_URL', { infer: true });
    this.databaseUrl = config.get('DATABASE_URL', { infer: true });
    this.redisUrl = config.get('REDIS_URL', { infer: true });
    this.jwtSecret = config.get('JWT_SECRET', { infer: true });
    this.jwtExpiresDays = config.get('JWT_EXPIRES_DAYS', { infer: true });
    this.cookieSecure = config.get('COOKIE_SECURE', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
