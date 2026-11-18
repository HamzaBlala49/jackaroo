import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthError } from '../common/app-error';
import { SESSION_COOKIE_NAME, type RequestWithUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    const bearer =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;
    const token = bearer ?? request.cookies?.[SESSION_COOKIE_NAME];
    if (!token) throw new AuthError();
    const result = await this.auth.authenticateToken(token);
    request.user = result.user;
    request.sessionId = result.sessionId;
    return true;
  }
}
