import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, ServerOptions } from 'socket.io';
import type Redis from 'ioredis';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/app-config.service';

export class AppIoAdapter extends IoAdapter {
  private readonly adapterLogger = new Logger(AppIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    await this.redis.connectNow();
    if (!this.redis.isAvailable) {
      this.adapterLogger.warn('Socket.IO Redis adapter disabled (Redis unavailable).');
      return;
    }
    try {
      const pub = this.redis.duplicate();
      const sub = this.redis.duplicate();
      if (!pub || !sub) throw new Error('Could not duplicate Redis clients');
      await Promise.all([pub.connect(), sub.connect()]);
      this.pubClient = pub;
      this.subClient = sub;
      this.adapterConstructor = createAdapter(pub, sub);
      this.adapterLogger.log('Socket.IO Redis adapter connected.');
    } catch (error) {
      this.adapterLogger.error(
        `Failed to connect Socket.IO Redis adapter: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  override createIOServer(port: number | undefined, options?: ServerOptions): Server {
    const merged = {
      ...options,
      cors: {
        origin: this.config.webOrigin,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    } as ServerOptions;
    const server = super.createIOServer(port, merged);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  override async close(): Promise<void> {
    await Promise.all([
      this.pubClient?.quit().catch(() => undefined),
      this.subClient?.quit().catch(() => undefined),
    ]);
    this.pubClient = null;
    this.subClient = null;
  }
}
