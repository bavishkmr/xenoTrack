require('dotenv').config();
const { Pool } = require('pg');

let poolConfig;

if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  // Strip ?sslmode=... so pg-connection-string doesn't force strict CA verification
  const cleanUrl = url.split('?')[0];
  poolConfig = {
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  };
} else {
  poolConfig = {
    host:     process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432', 10),
    user:     process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'postgres',
    ssl:      { rejectUnauthorized: false },
    max:      10,
    idleTimeoutMillis: 30000,
  };
}

const pgPool = new Pool(poolConfig);

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

pgPool.query('SELECT 1')
  .then(() => {
    console.log('✅ PostgreSQL (Supabase) connected');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed:', err.message);
  });

function createRowProxy(row) {
  if (!row || typeof row !== 'object') return row;
  const lowerMap = {};
  for (const key of Object.keys(row)) {
    lowerMap[key.toLowerCase()] = key;
  }
  return new Proxy(row, {
    get(target, prop) {
      if (typeof prop === 'string') {
        if (prop in target) return target[prop];
        const lower = prop.toLowerCase();
        if (lower in lowerMap) return target[lowerMap[lower]];
      }
      return target[prop];
    }
  });
}

function transformQuery(sql, params = []) {
  if (typeof sql !== 'string') {
    return { text: sql, values: params };
  }

  // Convert MySQL backticks `groups` to double quotes "groups"
  let text = sql.replace(/`([^`]+)`/g, '"$1"');

  // Convert boolean column comparisons e.g. is_reversed = 0 -> is_reversed = FALSE
  text = text
    .replace(/\b(is_reversed|is_active|is_primary|can_collect_fees|can_edit_attendance)\s*=\s*0\b/gi, '$1 = FALSE')
    .replace(/\b(is_reversed|is_active|is_primary|can_collect_fees|can_edit_attendance)\s*=\s*1\b/gi, '$1 = TRUE');

  const newParams = [];
  let paramIdx = 0;

  // Replace ? placeholders with $1, $2...
  text = text.replace(/\?/g, () => {
    if (paramIdx >= params.length) return '?';
    const val = params[paramIdx++];

    // Expand array parameter e.g. for WHERE id IN (?)
    if (Array.isArray(val)) {
      if (val.length === 0) return 'NULL';
      const placeholders = val.map((v) => {
        newParams.push(v);
        return `$${newParams.length}`;
      });
      return placeholders.join(', ');
    }

    newParams.push(val);
    return `$${newParams.length}`;
  });

  // If query is an INSERT and does not have RETURNING, append RETURNING id
  const trimmed = text.trim();
  if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
    text = `${text} RETURNING id`;
  }

  return { text, values: newParams };
}

async function executeQuery(runner, sql, params = []) {
  const { text, values } = transformQuery(sql, params);
  const result = await runner.query(text, values);

  const rows = (result.rows || []).map(createRowProxy);
  const insertId = result.rows && result.rows[0]?.id !== undefined ? result.rows[0].id : null;
  rows.insertId = insertId;
  rows.affectedRows = result.rowCount || 0;

  return [rows, result.fields || []];
}

const db = {
  async query(sql, params) {
    return executeQuery(pgPool, sql, params);
  },

  async getConnection() {
    const client = await pgPool.connect();
    return {
      async beginTransaction() {
        return client.query('BEGIN');
      },
      async commit() {
        return client.query('COMMIT');
      },
      async rollback() {
        return client.query('ROLLBACK');
      },
      release() {
        client.release();
      },
      async query(sql, params) {
        return executeQuery(client, sql, params);
      }
    };
  },

  end() {
    return pgPool.end();
  }
};

module.exports = db;
