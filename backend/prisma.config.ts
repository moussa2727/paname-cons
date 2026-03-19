import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.production' : '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default defineConfig({
  schema: path.resolve(process.cwd(), 'prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
});