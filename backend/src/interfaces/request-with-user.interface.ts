import { Request } from 'express';
import { User } from '@prisma/client';

export interface RequestWithUser extends Request {
  user: User;
}

export interface RequestWithSession extends Request {
  user: any;
  session: any;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  device: string;
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  userAgent: string;
  ip?: string;
}
