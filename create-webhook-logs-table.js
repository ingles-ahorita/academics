/**
 * Create webhook_logs table using Supabase JS client
 * Run with: node create-webhook-logs-table.js
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createWebhookLogsTable() {
  console.log('🚀 Creating webhook_logs table...\n');

  try {
    // Check if table already exists
    const { data: existing, error: checkError } = await supabase
      .from('webhook_logs')
      .select('id')
      .limit(1);

    if (existing !== null && !checkError) {
      console.log('✅ webhook_logs table already exists!');
      return;
    }

    // Since Supabase JS client doesn't support DDL, we need to use the Management API
    // or guide the user to run SQL manually
    console.log('⚠️  Supabase JS client cannot create tables directly.');
    console.log('📋 Please run the SQL script in Supabase Dashboard:\n');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the contents of supabase_webhook_logs.sql');
    console.log('5. Click "Run"\n');

    // Try to provide a helpful message
    console.log('Alternatively, you can use the Supabase CLI:');
    console.log('  supabase db execute --file supabase_webhook_logs.sql\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run the SQL manually in Supabase Dashboard → SQL Editor');
  }
}

createWebhookLogsTable();

