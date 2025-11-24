import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "./user.schema"; // Fixed import path

@Schema({
  timestamps: true,
})
export class Session extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user: User;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastActivity?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index(
  {
    user: 1,
    isActive: 1,
    expiresAt: 1,
  },
  {
    partialFilterExpression: { isActive: true },
  },
);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
