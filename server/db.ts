import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database file
const sqlite = new Database(path.join(dataDir, 'sqlite.db'));

// Create drizzle instance
export const db = drizzle(sqlite);

// Export the raw sqlite connection for direct queries
export { sqlite };
