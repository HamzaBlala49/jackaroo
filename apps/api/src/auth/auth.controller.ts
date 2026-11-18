import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { authGuestSchema, updateMeSchema, type AuthUser } from '@jackaroo/game-types';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { parseOrThrow } from '../common/app-error';
import { RateLimiterService } from '../common/rate-limiter.service';
import { SESSION_COOKIE_NAME, type RequestWithUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @Post('guest')
  async guest(
    @Body() body: unknown,
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const ip = request.ip ?? 'unknown';
    this.rateLimiter.consume(`auth:guest:${ip}`, 60, 60_000);
    const { displayName } = parseOrThrow(authGuestSchema, body);
    const userAgent = typeof request.headers['user-agent'] === 'string'
      ? request.headers['user-agent']
      : undefined;
    const result = await this.auth.createGuest(displayName, userAgent);
    this.auth.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): { user: AuthUser } {
    return { user };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<{ user: AuthUser }> {
    const { displayName } = parseOrThrow(updateMeSchema, body);
    const updated = await this.auth.updateDisplayName(user.id, displayName);
    return { user: updated };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ ok: true }> {
    const cookies = (request as RequestWithUser).cookies;
    const token =
      cookies?.[SESSION_COOKIE_NAME] ??
      (typeof request.headers.authorization === 'string' &&
      request.headers.authorization.startsWith('Bearer ')
        ? request.headers.authorization.slice(7)
        : undefined);
    await this.auth.revokeToken(token);
    this.auth.clearSessionCookie(response);
    return { ok: true };
  }
}
