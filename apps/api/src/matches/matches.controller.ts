import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { matchIdSchema, type AuthUser } from '@jackaroo/game-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { parseOrThrow } from '../common/app-error';
import { MatchesService } from './matches.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get('matches/:matchId')
  async getMatch(@Param('matchId') matchId: string, @CurrentUser() user: AuthUser) {
    const id = parseOrThrow(matchIdSchema, matchId);
    return { match: await this.matches.getResult(id, user.id) };
  }

  @Get('stats/me')
  async me(@CurrentUser() user: AuthUser) {
    return this.matches.getMyStats(user);
  }
}
