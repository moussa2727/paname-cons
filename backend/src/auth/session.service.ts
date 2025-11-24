import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Session } from "../schemas/session.schema";

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<Session>,
  ) {}

  async create(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<Session> {
    return this.sessionModel.create({
      user: userId,
      token,
      expiresAt,
      isActive: true,
    });
  }

  async revoke(token: string): Promise<void> {
    await this.sessionModel.updateOne({ token }, { isActive: false });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.sessionModel.updateMany(
      { user: userId, isActive: true },
      { isActive: false },
    );
  }

  async deleteSession(token: string): Promise<void> {
    await this.sessionModel.deleteOne({ token });
  }

  async deleteAllSessions(): Promise<{ deletedCount: number }> {
    const result = await this.sessionModel.deleteMany({}).exec();
    return { deletedCount: result.deletedCount };
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.sessionModel.deleteMany({ user: userId });
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.sessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }

  async getOldestSession(userId: string): Promise<Session | null> {
    return this.sessionModel
      .findOne({
        user: userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async countActiveSessions(userId: string): Promise<number> {
    return this.sessionModel.countDocuments({
      user: userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
  }

  async isTokenActive(token: string): Promise<boolean> {
    const session = await this.sessionModel.findOne({ token });
    return !!session?.isActive;
  }

  async getActiveSessionsByUser(userId: string): Promise<Session[]> {
    return this.sessionModel
      .find({
        user: userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async getExpiredSessions(): Promise<Session[]> {
    return this.sessionModel
      .find({
        expiresAt: { $lt: new Date() },
        isActive: true,
      })
      .exec();
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionModel.updateMany(
      { expiresAt: { $lt: new Date() } },
      { isActive: false },
    );
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    return this.sessionModel.findOne({ token }).exec();
  }

  async updateSessionActivity(token: string): Promise<void> {
    await this.sessionModel.updateOne({ token }, { lastActivity: new Date() });
  }
}
