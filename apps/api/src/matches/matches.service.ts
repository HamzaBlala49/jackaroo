import { Injectable } from '@nestjs/common';
import type { AuthUser, MatchResultView, UserStatsView } from '@jackaroo/game-types';
import { RoomsService } from '../rooms/rooms.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(
    private readonly rooms: RoomsService,
    private readonly prisma: PrismaService,
  ) {}

  getResult(matchId: string, userId: string): Promise<MatchResultView> {
    return this.rooms.getMatchResult(matchId, userId);
  }

  async getMyStats(user: AuthUser): Promise<{ user: AuthUser; stats: UserStatsView | null }> {
    const stats = await this.rooms.getMyStats(user.id);
    return {
      user,
      stats: stats
        ? {
            gamesPlayed: stats.gamesPlayed,
            gamesWon: stats.gamesWon,
            marblesHome: stats.marblesHome,
            captures: stats.captures,
            moves: stats.moves,
            cardsPlayed: stats.cardsPlayed,
            totalPlaySeconds: stats.totalPlaySeconds,
          }
        : null,
    };
  }

  async participantCount(matchId: string): Promise<number> {
    return this.prisma.gameHistory.count({ where: { matchId } });
  }
}
