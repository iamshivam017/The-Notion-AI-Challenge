// ReflectionMemory — SQLite-backed meta-learning store (via sql.js — pure JS)

import initSqlJs from 'sql.js';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

export class ReflectionMemory {
  constructor(dbPath = 'data/reflection.db') {
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
      CREATE TABLE IF NOT EXISTS reflections (
        id TEXT PRIMARY KEY, iteration INTEGER NOT NULL, agent TEXT NOT NULL,
        action TEXT NOT NULL, outcome TEXT NOT NULL, reasoning TEXT,
        score REAL DEFAULT 0, tags TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS evolution_log (
        id TEXT PRIMARY KEY, iteration INTEGER NOT NULL, phase TEXT DEFAULT 'unknown',
        changes_made TEXT NOT NULL, metrics_before TEXT DEFAULT '{}',
        metrics_after TEXT DEFAULT '{}', improvement_delta REAL DEFAULT 0,
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

  // --- Reflections ---
  storeReflection(iteration, agent, action, outcome, reasoning = '', score = 0, tags = []) {
    const id = uuid();
    this._exec(
      'INSERT INTO reflections (id, iteration, agent, action, outcome, reasoning, score, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, iteration, agent, action, outcome, reasoning, score, JSON.stringify(tags)]
    );
    return id;
  }

  getReflections({ agent, iteration, minScore, limit = 50 } = {}) {
    let sql = 'SELECT * FROM reflections WHERE 1=1';
    const params = [];
    if (agent) { sql += ' AND agent = ?'; params.push(agent); }
    if (iteration !== undefined) { sql += ' AND iteration = ?'; params.push(iteration); }
    if (minScore !== undefined) { sql += ' AND score >= ?'; params.push(minScore); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return this._queryAll(sql, params).map(r => ({ ...r, tags: JSON.parse(r.tags) }));
  }

  getAgentReflectionSummary(agent) {
    const row = this._queryOne(`
      SELECT COUNT(*) as total, AVG(score) as avg_score, MIN(score) as min_score,
        MAX(score) as max_score,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successes,
        SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failures
      FROM reflections WHERE agent = ?
    `, [agent]);
    return row;
  }

  getSuccessPatterns(agent, limit = 10) {
    return this._queryAll(
      "SELECT action, reasoning, score FROM reflections WHERE agent = ? AND outcome = 'success' ORDER BY score DESC LIMIT ?",
      [agent, limit]
    );
  }

  getFailurePatterns(agent, limit = 10) {
    return this._queryAll(
      "SELECT action, reasoning, score FROM reflections WHERE agent = ? AND outcome = 'failure' ORDER BY created_at DESC LIMIT ?",
      [agent, limit]
    );
  }

  // --- Evolution Log ---
  logEvolution(iteration, phase, changesMade, metricsBefore = {}, metricsAfter = {}) {
    const id = uuid();
    const delta = this._computeDelta(metricsBefore, metricsAfter);
    this._exec(
      'INSERT INTO evolution_log (id, iteration, phase, changes_made, metrics_before, metrics_after, improvement_delta) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, iteration, phase, JSON.stringify(changesMade), JSON.stringify(metricsBefore), JSON.stringify(metricsAfter), delta]
    );
    return { id, delta };
  }

  getEvolutionLog(limit = 50) {
    return this._queryAll('SELECT * FROM evolution_log ORDER BY iteration DESC, created_at DESC LIMIT ?', [limit])
      .map(r => ({
        ...r,
        changes_made: JSON.parse(r.changes_made),
        metrics_before: JSON.parse(r.metrics_before),
        metrics_after: JSON.parse(r.metrics_after),
      }));
  }

  getEvolutionTrend() {
    return this._queryAll(
      'SELECT iteration, AVG(improvement_delta) as avg_delta, COUNT(*) as changes FROM evolution_log GROUP BY iteration ORDER BY iteration ASC'
    );
  }

  _computeDelta(before, after) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    if (keys.size === 0) return 0;
    let totalDelta = 0, count = 0;
    for (const key of keys) {
      const b = typeof before[key] === 'number' ? before[key] : 0;
      const a = typeof after[key] === 'number' ? after[key] : 0;
      if (b !== 0) { totalDelta += (a - b) / Math.abs(b); count++; }
    }
    return count > 0 ? totalDelta / count : 0;
  }

  getStats() {
    const rc = this._queryOne('SELECT COUNT(*) as c FROM reflections')?.c || 0;
    const ec = this._queryOne('SELECT COUNT(*) as c FROM evolution_log')?.c || 0;
    return { ...this.stats, reflectionCount: rc, evolutionCount: ec };
  }

  destroy() {
    if (this.db) { this._save(); this.db.close(); }
  }
}
