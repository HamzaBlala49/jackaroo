import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RoomStoreService } from './room-store.service';

@Global()
@Module({
  providers: [RedisService, RoomStoreService],
  exports: [RedisService, RoomStoreService],
})
export class RedisModule {}
