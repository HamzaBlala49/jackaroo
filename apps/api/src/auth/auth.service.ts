import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { AuthError } from '../common/app-error';
import { SESSION_COOKIE_NAME, type AuthResult, type JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async createGuest(
    displayName: string,
    userAgent: string | undefined,
  ): Promise<{ token: string; user: { id: string; displayName: string }; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.config.jwtExpiresDays * 24 * 60 * 60 * 1000);
    const jti = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        displayName,
        sessions: {
          create: {
            jti,
            expiresAt,
            userAgent: userAgent?.slice(0, 500),
          },
        },
      },
    });

    const token = await this.jwt.signAsync(
      { sub: user.id, jti, name: user.displayName },
      {
        secret: this.config.jwtSecret,
        expiresIn: `${this.config.jwtExpiresDays}d`,
        issuer: 'jackaroo',
      },
    );

    return { token, user: { id: user.id, displayName: user.displayName }, expiresAt };
  }

  async updateDisplayName(userId: string, displayName: string): Promise<{ id: string; displayName: string }> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { displayName },
      select: { id: true, displayName: true },
    });
  }

  async authenticateToken(token: string | undefined): Promise<AuthResult> {
    if (!token) throw new AuthError();
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwtSecret,
        issuer: 'jackaroo',
      });
    } catch {
      throw new AuthError('Your session has expired. Please sign in again.');
    }
    if (!payload.sub || !payload.jti) throw new AuthError();

    const session = await this.prisma.authSession.findUnique({
      where: { jti: payload.jti },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new AuthError('Your session has expired. Please sign in again.');
    }

    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      void this.prisma.authSession
        .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined);
    }

    return {
      user: { id: session.user.id, displayName: session.user.displayName },
      sessionId: session.id,
    };
  }

  async revokeToken(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwtSecret,
        issuer: 'jackaroo',
        ignoreExpiration: true,
      });
      await this.prisma.authSession.updateMany({
        where: { jti: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Invalid or already expired tokens are treated as logged out.
    }
  }

  setSessionCookie(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.jwtExpiresDays * 24 * 60 * 60 * 1000,
    });
  }

  clearSessionCookie(response: Response): void {
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
  }

  extractTokenFromCookieHeader(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(';')) {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (rawName === SESSION_COOKIE_NAME) {
        return decodeURIComponent(rawValue.join('='));
      }
    }
    return undefined;
  }
}
