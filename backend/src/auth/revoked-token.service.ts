import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RevokedToken } from "../schemas/revoked-token.schema";

@Injectable()
export class RevokedTokenService {
  private readonly logger = new Logger(RevokedTokenService.name);

  constructor(
    @InjectModel(RevokedToken.name)
    private revokedTokenModel: Model<RevokedToken>,
    private jwtService: JwtService,
  ) {}

  async revokeToken(token: string, expiresAt: Date): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      const userId = decoded?.sub;

      const exists = await this.revokedTokenModel.findOne({ token });
      if (!exists) {
        await this.revokedTokenModel.create({
          token,
          userId,
          expiresAt,
        });
      }
    } catch (error) {
      this.logger.error(`Erreur revocation token: ${error.message}`);
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    const found = await this.revokedTokenModel.findOne({ token }).exec();
    return !!found;
  }

  async revokeAllTokens(): Promise<{
    [x: string]: any;
    message: string;
    revokedCount: number;
  }> {
    const result = await this.revokedTokenModel.deleteMany({}).exec();
    return {
      message: `${result.deletedCount} tokens révoqués`,
      revokedCount: result.deletedCount,
    };
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.revokedTokenModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
  }

  async revokeTokensForUser(userId: string): Promise<void> {
    await this.revokedTokenModel.deleteMany({ userId }).exec();
  }
}
