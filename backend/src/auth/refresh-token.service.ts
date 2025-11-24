import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RefreshToken } from "../schemas/refresh-token.schema";

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}

  async create(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    return this.refreshTokenModel.create({
      user: userId,
      token,
      expiresAt,
      isActive: true,
    });
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.refreshTokenModel
      .updateMany({ user: userId }, { isActive: false })
      .exec();
  }

  async isValid(token: string): Promise<boolean> {
    const doc = await this.refreshTokenModel
      .findOne({
        token,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .exec();
    return !!doc;
  }

  async deactivateByToken(token: string): Promise<void> {
    await this.refreshTokenModel
      .updateOne({ token }, { isActive: false })
      .exec();
  }

  async deleteByToken(token: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ token }).exec();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({ user: userId }).exec();
  }
}
