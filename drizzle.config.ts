import { defineConfig } from "drizzle-kit";

// This project uses MySQL, not PostgreSQL
// Database credentials are managed through MySQL-specific environment variables
// Note: Drizzle config is kept for potential future schema management
// Currently, the application connects directly to MySQL via mysql2/promise

if (!process.env.MYSQL_HOST) {
  console.warn("Warning: MYSQL_HOST not set. Database operations may fail.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  },
});
