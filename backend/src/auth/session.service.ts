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

  async create(userId: string, token: string, expiresAt: Date): Promise<Session> {
    this.logger.log(`Creating session for user ${userId}`);
    
    const session = await this.sessionModel.create({ 
      user: userId, 
      token, 
      expiresAt, 
      isActive: true 
    });

    this.logger.log(`Session created successfully for user ${userId}`);
    return session;
  }

  async revoke(token: string): Promise<void> {
    this.logger.log(`Revoking session with token: ${token.substring(0, 10)}...`);
    
    const result = await this.sessionModel.updateOne({ token }, { isActive: false });
    
    if (result.modifiedCount > 0) {
      this.logger.log(`Session revoked successfully: ${token.substring(0, 10)}...`);
    } else {
      this.logger.warn(`No active session found to revoke: ${token.substring(0, 10)}...`);
    }
  }

  async revokeAll(userId: string): Promise<void> {
    this.logger.log(`Revoking all sessions for user ${userId}`);
    
    const result = await this.sessionModel.updateMany(
      { user: userId, isActive: true }, 
      { isActive: false }
    );

    this.logger.log(`Revoked ${result.modifiedCount} sessions for user ${userId}`);
  }

  async deleteSession(token: string): Promise<void> {
    this.logger.log(`Deleting session with token: ${token.substring(0, 10)}...`);
    
    const result = await this.sessionModel.deleteOne({ token });

    if (result.deletedCount > 0) {
      this.logger.log(`Session deleted successfully: ${token.substring(0, 10)}...`);
    } else {
      this.logger.warn(`No session found to delete: ${token.substring(0, 10)}...`);
    }
  }

  async deleteAllSessions(): Promise<{ deletedCount: number }> {
    this.logger.warn(`Deleting ALL sessions - this will clear the entire sessions collection`);
    
    const result = await this.sessionModel.deleteMany({}).exec();
    
    this.logger.log(`Deleted all sessions: ${result.deletedCount} sessions removed`);
    return { deletedCount: result.deletedCount };
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    this.logger.log(`Deleting all sessions for user ${userId}`);
    
    const result = await this.sessionModel.deleteMany({ user: userId });
    
    this.logger.log(`Deleted ${result.deletedCount} sessions for user ${userId}`);
  }

  async deleteExpiredSessions(): Promise<void> {
    this.logger.log(`Deleting expired sessions`);
    
    const result = await this.sessionModel.deleteMany({ 
      expiresAt: { $lt: new Date() } 
    });

    this.logger.log(`Deleted ${result.deletedCount} expired sessions`);
  }

  async getOldestSession(userId: string): Promise<Session | null> {
    this.logger.debug(`Getting oldest session for user ${userId}`);
    
    const result = await (this.sessionModel as any)
      .findOne({
        user: userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: 1 })
      .exec();
    
    this.logger.debug(`Oldest session query completed for user ${userId}`);
    return result;
  }

  async countActiveSessions(userId: string): Promise<number> {
    this.logger.debug(`Counting active sessions for user ${userId}`);
    
    const count = await this.sessionModel.countDocuments({
      user: userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).exec();

    this.logger.debug(`User ${userId} has ${count} active sessions`);
    return count;
  }

  async isTokenActive(token: string): Promise<boolean> {
    this.logger.debug(`Checking if token is active: ${token.substring(0, 10)}...`);
    
    const session = await (this.sessionModel as any).findOne({ token }).exec();
    const isActive = !!session?.isActive;
    
    this.logger.debug(`Token active status: ${isActive} for ${token.substring(0, 10)}...`);
    return isActive;
  }

  async getActiveSessionsByUser(userId: string): Promise<Session[]> {
    this.logger.debug(`Getting active sessions for user ${userId}`);
    
    const sessions = await (this.sessionModel as any)
      .find({
        user: userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    this.logger.debug(`Found ${sessions.length} active sessions for user ${userId}`);
    return sessions;
  }

  async getExpiredSessions(): Promise<Session[]> {
    this.logger.debug(`Getting expired sessions`);
    
    const sessions = await (this.sessionModel as any)
      .find({
        expiresAt: { $lt: new Date() },
        isActive: true,
      })
      .exec();

    this.logger.debug(`Found ${sessions.length} expired sessions`);
    return sessions;
  }

  async cleanupExpiredSessions(): Promise<void> {
    this.logger.log(`Cleaning up expired sessions (deactivating)`);
    
    const result = await this.sessionModel.updateMany(
      { expiresAt: { $lt: new Date() } },
      { isActive: false },
    );

    this.logger.log(`Cleaned up ${result.modifiedCount} expired sessions`);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    this.logger.debug(`Getting session by token: ${token.substring(0, 10)}...`);
    
    const session = await (this.sessionModel as any).findOne({ token }).exec();
    
    this.logger.debug(`Session lookup completed for token: ${token.substring(0, 10)}...`);
    return session;
  }

  async updateSessionActivity(token: string): Promise<void> {
    this.logger.debug(`Updating session activity for token: ${token.substring(0, 10)}...`);
    
    const result = await this.sessionModel.updateOne(
      { token }, 
      { lastActivity: new Date() }
    );

    if (result.modifiedCount > 0) {
      this.logger.debug(`Session activity updated for token: ${token.substring(0, 10)}...`);
    } else {
      this.logger.warn(`No session found to update activity for token: ${token.substring(0, 10)}...`);
    }
  }
}