import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomsModule } from '../rooms/rooms.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [AuthModule, RoomsModule],
  controllers: [MatchesController],
  providers: [MatchesService, JwtAuthGuard],
})
export class MatchesModule {}
