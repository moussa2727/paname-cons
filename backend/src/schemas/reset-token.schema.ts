import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "./user.schema";

@Schema({
  timestamps: true,
  collection: "password_reset_tokens",
})
export class ResetToken extends Document {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
  })
  user: User;

  @Prop({
    type: Date,
    required: true,
  })
  expiresAt: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  used: boolean;

  @Prop({
    type: String,
    enum: ["pending", "used", "expired"],
    default: "pending",
  })
  status: string;
}

export const ResetTokenSchema = SchemaFactory.createForClass(ResetToken);

// Single index definition for expiration
ResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Middleware pour empêcher la réutilisation des tokens
ResetTokenSchema.pre("save", function (next) {
  if (this.isModified("used") && this.used) {
    this.status = "used";
  }
  next();
});

export type ResetTokenDocument = ResetToken &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };
