import { Controller, Get, Param } from '@nestjs/common';
import { roomCodeSchema } from '@jackaroo/game-types';
import { parseOrThrow } from '../common/app-error';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get(':code')
  async getRoom(@Param('code') code: string) {
    const normalized = parseOrThrow(roomCodeSchema, code);
    return { room: await this.rooms.getPublicRoom(normalized) };
  }
}
