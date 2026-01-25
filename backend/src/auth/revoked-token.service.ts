import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RevokedToken } from '../schemas/revoked-token.schema';

@Injectable()
export class RevokedTokenService {
  private readonly logger = new Logger(RevokedTokenService.name);

  constructor(
    @InjectModel(RevokedToken.name)
    private revokedTokenModel: Model<RevokedToken>,
    private jwtService: JwtService
  ) {}

  async revokeToken(access_token: string, expiresAt: Date): Promise<void> {
    try {
      let userId = null;
      try {
        const decoded = this.jwtService.decode(access_token) as any;
        userId = decoded?.sub || decoded?.id;
      } catch (e) {
        this.logger.warn(`Cannot decode token for revocation: ${e.message}`);
      }

      this.logger.debug(
        `Attempting revocation for user: ${userId || 'unknown'}`
      );

      const exists = await this.revokedTokenModel
        .findOne({ token: access_token })
        .lean();

      if (!exists) {
        await this.revokedTokenModel.create({
          token: access_token,
          userId,
          expiresAt,
        });
        this.logger.verbose(`Token stored in blacklist`);
      }
    } catch (error) {
      this.logger.error(`Error during token revocation: ${error.message}`);
      throw error;
    }
  }

  async isTokenRevoked(access_token: string): Promise<boolean> {
    const found = await this.revokedTokenModel
      .findOne({ token: access_token })
      .select('_id')
      .lean();
    return !!found;
  }

  async revokeAllTokens(): Promise<{ message: string; revokedCount: number }> {
    const result = await this.revokedTokenModel.deleteMany({}).exec();

    this.logger.log(`Flush database: ${result.deletedCount} items removed`);

    return {
      message: `Opération réussie`,
      revokedCount: result.deletedCount,
    };
  }

  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.revokedTokenModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();

    this.logger.log(
      `Cleanup completed: ${result.deletedCount} expired tokens removed`
    );
  }

  async revokeTokensForUser(userId: string): Promise<void> {
    await this.revokedTokenModel.deleteMany({ userId }).exec();
    this.logger.log(`User ${userId} tokens cleared from revocation list`);
  }
}
