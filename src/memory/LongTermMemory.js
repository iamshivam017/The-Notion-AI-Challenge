// LongTermMemory — SQLite-backed persistent store (via sql.js — pure JS)
// Stores past architectures, mistakes, improvements, and patterns

import initSqlJs from 'sql.js';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

export class LongTermMemory {
  constructor(dbPath = 'data/long_term.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.ready = this._init();
    this.stats = { writes: 0, reads: 0 };
  }

  async _init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buf = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }

    this._migrate();
    return true;
  }

  _ensureReady() {
    if (!this.db) throw new Error('Database not initialized. Await .ready first.');
  }

  _save() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  _migrate() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS architectures (
        id TEXT PRIMARY KEY, version INTEGER NOT NULL, structure TEXT NOT NULL,
        score REAL DEFAULT 0, tags TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS mistakes (
        id TEXT PRIMARY KEY, agent TEXT NOT NULL, description TEXT NOT NULL,
        context TEXT DEFAULT '{}', resolution TEXT, severity TEXT DEFAULT 'medium',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS improvements (
        id TEXT PRIMARY KEY, area TEXT NOT NULL, before_state TEXT NOT NULL,
        after_state TEXT NOT NULL, impact_score REAL DEFAULT 0, iteration INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY, category TEXT NOT NULL, pattern_data TEXT NOT NULL,
        frequency INTEGER DEFAULT 1, last_seen TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    this._save();
  }

  _queryAll(sql, params = []) {
    this._ensureReady();
    this.stats.reads++;
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  _queryOne(sql, params = []) {
    const rows = this._queryAll(sql, params);
    return rows[0] || null;
  }

  _exec(sql, params = []) {
    this._ensureReady();
    this.stats.writes++;
    this.db.run(sql, params);
    this._save();
  }

  // --- Architectures ---
  storeArchitecture(structure, score = 0, tags = []) {
    const id = uuid();
    const row = this._queryOne('SELECT MAX(version) as v FROM architectures');
    const version = (row?.v || 0) + 1;
    this._exec(
      'INSERT INTO architectures (id, version, structure, score, tags) VALUES (?, ?, ?, ?, ?)',
      [id, version, JSON.stringify(structure), score, JSON.stringify(tags)]
    );
    return { id, version };
  }

  getLatestArchitecture() {
    const row = this._queryOne('SELECT * FROM architectures ORDER BY version DESC LIMIT 1');
    return row ? { ...row, structure: JSON.parse(row.structure), tags: JSON.parse(row.tags) } : null;
  }

  getArchitectures(limit = 10) {
    return this._queryAll('SELECT * FROM architectures ORDER BY version DESC LIMIT ?', [limit])
      .map(r => ({ ...r, structure: JSON.parse(r.structure), tags: JSON.parse(r.tags) }));
  }

  // --- Mistakes ---
  storeMistake(agent, description, context = {}, severity = 'medium') {
    const id = uuid();
    this._exec(
      'INSERT INTO mistakes (id, agent, description, context, severity) VALUES (?, ?, ?, ?, ?)',
      [id, agent, description, JSON.stringify(context), severity]
    );
    return id;
  }

  resolveMistake(id, resolution) {
    this._exec('UPDATE mistakes SET resolution = ? WHERE id = ?', [resolution, id]);
  }

  getMistakes({ agent, severity, limit = 20 } = {}) {
    let sql = 'SELECT * FROM mistakes WHERE 1=1';
    const params = [];
    if (agent) { sql += ' AND agent = ?'; params.push(agent); }
    if (severity) { sql += ' AND severity = ?'; params.push(severity); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return this._queryAll(sql, params).map(r => ({ ...r, context: JSON.parse(r.context) }));
  }

  // --- Improvements ---
  storeImprovement(area, beforeState, afterState, impactScore = 0, iteration = 0) {
    const id = uuid();
    this._exec(
      'INSERT INTO improvements (id, area, before_state, after_state, impact_score, iteration) VALUES (?, ?, ?, ?, ?, ?)',
      [id, area, JSON.stringify(beforeState), JSON.stringify(afterState), impactScore, iteration]
    );
    return id;
  }

  getImprovements({ area, limit = 20 } = {}) {
    let sql = 'SELECT * FROM improvements WHERE 1=1';
    const params = [];
    if (area) { sql += ' AND area = ?'; params.push(area); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return this._queryAll(sql, params).map(r => ({
      ...r, before_state: JSON.parse(r.before_state), after_state: JSON.parse(r.after_state)
    }));
  }

  // --- Patterns ---
  storePattern(category, patternData) {
    const id = uuid();
    this._exec('INSERT INTO patterns (id, category, pattern_data) VALUES (?, ?, ?)',
      [id, category, JSON.stringify(patternData)]);
    return id;
  }

  incrementPattern(id) {
    this._exec("UPDATE patterns SET frequency = frequency + 1, last_seen = datetime('now') WHERE id = ?", [id]);
  }

  getPatterns({ category, limit = 20 } = {}) {
    let sql = 'SELECT * FROM patterns WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY frequency DESC, last_seen DESC LIMIT ?';
    params.push(limit);
    return this._queryAll(sql, params).map(r => ({ ...r, pattern_data: JSON.parse(r.pattern_data) }));
  }

  // --- General ---
  getAllCounts() {
    return {
      architectures: this._queryOne('SELECT COUNT(*) as c FROM architectures')?.c || 0,
      mistakes: this._queryOne('SELECT COUNT(*) as c FROM mistakes')?.c || 0,
      improvements: this._queryOne('SELECT COUNT(*) as c FROM improvements')?.c || 0,
      patterns: this._queryOne('SELECT COUNT(*) as c FROM patterns')?.c || 0,
    };
  }

  getStats() { return { ...this.stats, counts: this.getAllCounts() }; }

  destroy() {
    if (this.db) { this._save(); this.db.close(); }
  }
}
