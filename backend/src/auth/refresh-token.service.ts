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
    this.logger.log(`Creating refresh token for user ${userId}`);
    
    const refreshToken = await this.refreshTokenModel.create({
      user: userId,
      token,
      expiresAt,
      isActive: true,
    });

    this.logger.log(`Refresh token created successfully for user ${userId}`);
    return refreshToken;
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    this.logger.log(`Deactivating all refresh tokens for user ${userId}`);
    
    const result = await this.refreshTokenModel
      .updateMany({ user: userId }, { isActive: false })
      .exec();

    this.logger.log(`Deactivated ${result.modifiedCount} refresh tokens for user ${userId}`);
  }

  async isValid(token: string): Promise<boolean> {
    this.logger.debug(`Validating refresh token: ${token.substring(0, 10)}...`);
    
    const doc = await this.refreshTokenModel
      .findOne({
        token,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    const isValid = !!doc;
    this.logger.debug(`Refresh token validation result: ${isValid}`);
    
    return isValid;
  }

  async deactivateByToken(token: string): Promise<void> {
    this.logger.log(`Deactivating refresh token: ${token.substring(0, 10)}...`);
    
    const result = await this.refreshTokenModel
      .updateOne({ token }, { isActive: false })
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(`Successfully deactivated refresh token: ${token.substring(0, 10)}...`);
    } else {
      this.logger.warn(`No refresh token found to deactivate: ${token.substring(0, 10)}...`);
    }
  }

  async deleteByToken(token: string): Promise<void> {
    this.logger.log(`Deleting refresh token: ${token.substring(0, 10)}...`);
    
    const result = await this.refreshTokenModel.deleteOne({ token }).exec();

    if (result.deletedCount > 0) {
      this.logger.log(`Successfully deleted refresh token: ${token.substring(0, 10)}...`);
    } else {
      this.logger.warn(`No refresh token found to delete: ${token.substring(0, 10)}...`);
    }
  }

  async deleteAllForUser(userId: string): Promise<void> {
    this.logger.log(`Deleting all refresh tokens for user ${userId}`);
    
    const result = await this.refreshTokenModel.deleteMany({ user: userId }).exec();

    this.logger.log(`Deleted ${result.deletedCount} refresh tokens for user ${userId}`);
  }
}