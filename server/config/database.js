import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import initSqlJs from 'sql.js';

dotenv.config();

let dbType = 'none';
let mysqlPool = null;
let sqlJsDb = null;
const sqliteFilePath = path.resolve(process.cwd(), 'database/tribal_scholar.sqlite');

/**
 * Initializes the database.
 * Attempts MySQL connection first; falls back to embedded SQL (sql.js)
 * with persistence to ensure 100% reliable local preview & hackathon demo.
 */
export async function initDatabase() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'tribal_scholar_ai';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

  // Attempt MySQL connection if configured
  if (process.env.DB_HOST) {
    try {
      console.log(`[Database] Attempting connection to MySQL at ${dbHost}:${dbPort}/${dbName}...`);
      const testConnection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        connectTimeout: 3000,
      });

      // Ensure database exists
      await testConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await testConnection.end();

      mysqlPool = mysql.createPool({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      dbType = 'mysql';
      console.log(`[Database] Successfully connected to MySQL database: ${dbName}`);
      await runMigrationsAndSeedIfEmpty();
      return;
    } catch (err) {
      console.warn(`[Database] MySQL connection failed (${err.message}). Falling back to embedded SQL engine.`);
    }
  }

  // Fallback: Embedded SQLite engine via sql.js
  try {
    const SQL = await initSqlJs();
    let fileBuffer = null;
    if (fs.existsSync(sqliteFilePath)) {
      try {
        fileBuffer = fs.readFileSync(sqliteFilePath);
      } catch (e) {
        console.warn('[Database] Could not read existing sqlite file:', e.message);
      }
    }

    sqlJsDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
    dbType = 'sqlite';
    console.log('[Database] Embedded SQL engine initialized successfully.');
    await runMigrationsAndSeedIfEmpty();
    saveSqliteToFile();
  } catch (sqlErr) {
    console.error('[Database] Failed to initialize embedded SQL engine:', sqlErr);
    throw sqlErr;
  }
}

/**
 * Saves embedded sqlite database to disk
 */
function saveSqliteToFile() {
  if (dbType === 'sqlite' && sqlJsDb) {
    try {
      const data = sqlJsDb.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(sqliteFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(sqliteFilePath, buffer);
    } catch (err) {
      console.error('[Database] Error saving database to file:', err.message);
    }
  }
}

/**
 * Executes a query that returns rows (SELECT)
 */
export async function query(sql, params = []) {
  if (dbType === 'mysql') {
    try {
      const [rows] = await mysqlPool.query(sql, params);
      return rows;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || (err.message && err.message.toLowerCase().includes("doesn't exist"))) {
        console.warn(`[Database] Missing table detected during query (${err.message}). Auto-running schema repair...`);
        await runMigrationsAndSeedIfEmpty(true);
        const [retryRows] = await mysqlPool.query(sql, params);
        return retryRows;
      }
      throw err;
    }
  } else if (dbType === 'sqlite') {
    const stmt = sqlJsDb.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
  throw new Error('Database not initialized');
}

/**
 * Executes a single row query
 */
export async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Executes an INSERT/UPDATE/DELETE query
 */
export async function execute(sql, params = []) {
  if (dbType === 'mysql') {
    try {
      const [result] = await mysqlPool.execute(sql, params);
      return {
        insertId: result.insertId,
        affectedRows: result.affectedRows,
      };
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || (err.message && err.message.toLowerCase().includes("doesn't exist"))) {
        console.warn(`[Database] Missing table detected during execute (${err.message}). Auto-running schema repair...`);
        await runMigrationsAndSeedIfEmpty(true);
        const [retryResult] = await mysqlPool.execute(sql, params);
        return {
          insertId: retryResult.insertId,
          affectedRows: retryResult.affectedRows,
        };
      }
      throw err;
    }
  } else if (dbType === 'sqlite') {
    // If multiple statements, run run(), else bind and step
    sqlJsDb.run(sql, params);
    let lastId = 0;
    try {
      const res = sqlJsDb.exec('SELECT last_insert_rowid() as id');
      if (res.length > 0 && res[0].values.length > 0) {
        lastId = res[0].values[0][0];
      }
    } catch (e) {
      // ignore
    }
    saveSqliteToFile();
    return {
      insertId: lastId,
      affectedRows: 1,
    };
  }
  throw new Error('Database not initialized');
}

/**
 * Auto-creates tables and seeds data if database is empty or tables missing
 */
async function runMigrationsAndSeedIfEmpty(force = false) {
  if (dbType === 'mysql') {
    let needsMigration = force;
    if (!needsMigration) {
      try {
        const [scholarshipTables] = await mysqlPool.query("SHOW TABLES LIKE 'scholarships'");
        const [userTables] = await mysqlPool.query("SHOW TABLES LIKE 'users'");
        if (scholarshipTables.length === 0 || userTables.length === 0) {
          needsMigration = true;
        } else {
          const [countRes] = await mysqlPool.query("SELECT COUNT(*) AS count FROM scholarships");
          if (countRes && countRes[0] && countRes[0].count === 0) {
            needsMigration = true;
          }
        }
      } catch (checkErr) {
        needsMigration = true;
      }
    }

    if (needsMigration) {
      console.log('[Database] Initializing or repairing MySQL schema and seed data...');
      try {
        await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 0;');
      } catch (e) {}

      const schemaPath = path.resolve(process.cwd(), 'database/schema.sql');
      const seedPath = path.resolve(process.cwd(), 'database/seed.sql');

      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql
          .replace(/--.*$/gm, '')
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          try {
            await mysqlPool.query(stmt);
          } catch (e) {
            console.warn('[Database] Schema stmt warning:', e.message);
          }
        }
      }

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const statements = seedSql
          .replace(/--.*$/gm, '')
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          try {
            await mysqlPool.query(stmt);
          } catch (e) {
            console.warn('[Database] Seed stmt warning:', e.message);
          }
        }
      }

      try {
        await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1;');
      } catch (e) {}
      console.log('[Database] MySQL schema and seed completed successfully.');
    }
  } else if (dbType === 'sqlite') {
    // Check if users table exists
    let tableExists = false;
    try {
      const res = sqlJsDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
      tableExists = res.length > 0 && res[0].values.length > 0;
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      console.log('[Database] Creating embedded tables and inserting seed data...');
      // Convert MySQL schema to SQLite compatible DDL
      const sqliteSchema = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'student',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS student_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          date_of_birth TEXT,
          gender TEXT,
          category TEXT NOT NULL DEFAULT 'Scheduled Tribe (ST)',
          state TEXT,
          district TEXT,
          domicile TEXT,
          annual_family_income REAL,
          education_level TEXT,
          course TEXT,
          institution_name TEXT,
          year_of_study INTEGER DEFAULT 1,
          percentage REAL,
          cgpa REAL,
          bank_account_last4 TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS scholarships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          provider TEXT NOT NULL,
          description TEXT NOT NULL,
          scholarship_type TEXT NOT NULL DEFAULT 'Post-Matric',
          amount REAL NOT NULL DEFAULT 0.0,
          application_start TEXT NOT NULL,
          application_deadline TEXT NOT NULL,
          education_level TEXT DEFAULT 'Any',
          course TEXT DEFAULT 'All Courses',
          minimum_percentage REAL DEFAULT 0.0,
          maximum_income REAL DEFAULT 250000.0,
          eligible_states TEXT DEFAULT 'All States',
          eligible_categories TEXT DEFAULT 'Scheduled Tribe (ST)',
          required_documents TEXT,
          official_url TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS fellowships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          provider TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL DEFAULT 0.0,
          eligibility TEXT NOT NULL,
          application_start TEXT NOT NULL,
          application_deadline TEXT NOT NULL,
          field_of_study TEXT DEFAULT 'All Fields',
          minimum_qualification TEXT DEFAULT 'Post Graduate',
          required_documents TEXT,
          official_url TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          scholarship_id INTEGER,
          fellowship_id INTEGER,
          application_number TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'SUBMITTED',
          submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
          verified_at TEXT,
          approved_at TEXT,
          rejected_at TEXT,
          rejection_reason TEXT,
          remarks TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE SET NULL,
          FOREIGN KEY (fellowship_id) REFERENCES fellowships(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          application_id INTEGER NOT NULL,
          document_type TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          verification_status TEXT NOT NULL DEFAULT 'PENDING',
          verification_remarks TEXT,
          uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
          verified_at TEXT,
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'info',
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER,
          ip_address TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `;
      sqlJsDb.exec(sqliteSchema);

      // Read seed file and run statements
      const seedPath = path.resolve(process.cwd(), 'database/seed.sql');
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        const cleanedSeed = seedSql.replace(/--.*$/gm, '').trim();
        const statements = cleanedSeed
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          try {
            sqlJsDb.exec(stmt);
          } catch (e) {
            console.warn('[Database] Seed insert notice:', e.message);
          }
        }
      }
      saveSqliteToFile();
      console.log('[Database] Embedded tables seeded successfully.');
    }
  }
}

export function getDbType() {
  return dbType;
}

export default {
  initDatabase,
  query,
  get,
  execute,
  getDbType,
};
