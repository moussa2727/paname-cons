import { Module, MiddlewareConsumer } from '@nestjs/common';
import { SessionMiddleware } from './session.middleware';
import { TokensModule } from '../../tokens/tokens.module';

@Module({
  imports: [TokensModule],
})
export class SessionModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
