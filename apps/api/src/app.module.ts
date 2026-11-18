import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MatchesModule } from './matches/matches.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    RoomsModule,
    RealtimeModule,
    MatchesModule,
    HealthModule,
  ],
})
export class AppModule {}
