import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, immutable: true })
  firstName: string;

  @Prop({ required: true, immutable: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  telephone: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
    immutable: true,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  logoutUntil?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index pour les recherches courantes
UserSchema.index({ isActive: 1 });
UserSchema.index({ role: 1 });

// Middleware pour mettre à jour updatedAt
UserSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});
