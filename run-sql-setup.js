/**
 * Attempts to create webhook_logs table via Supabase
 * This uses the Supabase REST API to execute SQL
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🚀 Attempting to create webhook_logs table...\n');

  // SQL statements to execute
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS webhook_logs (
      id BIGSERIAL PRIMARY KEY,
      method TEXT NOT NULL,
      url TEXT,
      headers JSONB,
      body JSONB,
      status_code INTEGER NOT NULL,
      message TEXT,
      error TEXT,
      error_stack TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_code ON webhook_logs(status_code)`,
    `CREATE INDEX IF NOT EXISTS idx_webhook_logs_method ON webhook_logs(method)`,
    `ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "Allow service role to insert webhook logs" ON webhook_logs`,
    `CREATE POLICY "Allow service role to insert webhook logs"
      ON webhook_logs
      FOR INSERT
      TO service_role
      WITH CHECK (true)`,
    `DROP POLICY IF EXISTS "Allow authenticated users to read webhook logs" ON webhook_logs`,
    `CREATE POLICY "Allow authenticated users to read webhook logs"
      ON webhook_logs
      FOR SELECT
      TO authenticated
      USING (true)`,
    `CREATE OR REPLACE VIEW webhook_logs_summary AS
      SELECT 
        id,
        method,
        status_code,
        message,
        error,
        timestamp,
        ip,
        body->>'email' as email,
        body->>'customer'->>'email' as customer_email,
        body->>'purchase'->>'customer'->>'email' as purchase_customer_email
      FROM webhook_logs
      ORDER BY timestamp DESC`
  ];

  try {
    // Try to execute via Supabase REST API (this may not work for DDL)
    // Supabase doesn't expose DDL via REST API for security reasons
    console.log('⚠️  Supabase JS client cannot execute DDL statements directly.');
    console.log('📋 Please run the SQL in Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" in the left sidebar');
    console.log('4. Click "New query"');
    console.log('5. Copy and paste the contents of: supabase_webhook_logs.sql');
    console.log('6. Click "Run" (or press Cmd/Ctrl + Enter)\n');
    
    console.log('📄 SQL file location: supabase_webhook_logs.sql\n');
    
    // Try alternative: Check if we can use pg directly (requires pg package)
    console.log('💡 Alternative: Use Supabase CLI if installed:');
    console.log('   supabase db execute --file supabase_webhook_logs.sql\n');

    // Actually try to verify if table exists
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('id')
        .limit(1);
      
      if (!error) {
        console.log('✅ webhook_logs table already exists!');
        return;
      }
    } catch (e) {
      console.log('ℹ️  Table does not exist yet - please create it using the steps above\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTable();





