import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class RefreshToken extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deactivatedAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Define indexes separately to avoid duplicates
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ user: 1 });
