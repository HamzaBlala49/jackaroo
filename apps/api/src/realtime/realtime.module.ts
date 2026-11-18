import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GameGateway } from './game.gateway';

@Module({
  imports: [AuthModule, RoomsModule],
  providers: [GameGateway],
})
export class RealtimeModule {}
