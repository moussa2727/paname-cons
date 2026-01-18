import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  mongoUri: process.env.MONGODB_URI || process.env.MONGODB_URI,
  port: process.env.PORT || process.env.PORT,
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN,
  adminEmail: process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL,
  uploadDir: process.env.UPLOAD_DIR || process.env.UPLOAD_DIR,
  loadDir: process.env.LOAD_DIR || process.env.LOAD_DIR,
  resendApiKey: process.env.RESEND_API_KEY || process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL,
}));
