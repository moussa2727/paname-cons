import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from '../../interfaces/current-user.interface';

export const CurrentUserDecorator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUser }>();
    return request.user;
  },
);

// Exporter un alias pour maintenir la compatibilité
export { CurrentUserDecorator as CurrentUser };
