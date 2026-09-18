/**
 * Database connection singleton.
 * better-sqlite3 is synchronous, which is appropriate for Next.js API routes
 * running in Node.js (not Edge runtime). It simplifies error handling
 * compared to async SQLite drivers for this use case.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema';
import { logger } from '@/lib/utils/logger';

const DB_DIR = process.env.DB_DIR ?? path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'lexai.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  if (!fs.existsSync(/*turbopackIgnore: true*/ DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema migrations
  db.exec(SCHEMA_SQL);

  logger.info('Database initialised', { path: DB_PATH });
  return db;
}

/** For tests: creates an in-memory database. */
export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(SCHEMA_SQL);
  return testDb;
}
