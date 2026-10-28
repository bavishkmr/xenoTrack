const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: parseInt(process.env.POSTGRES_PORT || '6543'),
    user: process.env.POSTGRES_USER || 'postgres.bniccyxjrasdcnqdnkqt',
    password: process.env.POSTGRES_PASSWORD || '0JHZU2nT5wizDVTq',
    database: process.env.POSTGRES_DATABASE || 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to Supabase.');

    console.log('Applying supabase_schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('✅ Schema applied successfully.');

    console.log('Applying supabase_seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'supabase_seed.sql'), 'utf-8');
    await client.query(seedSql);
    console.log('✅ Seed data applied successfully.');

    const res = await client.query('SELECT count(*) as count FROM users');
    console.log(`✅ Verified: ${res.rows[0].count} user(s) in Supabase users table.`);

    await client.end();
    console.log('🎉 Supabase database setup is 100% complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();

