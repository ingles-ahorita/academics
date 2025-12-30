/**
 * Script to set up webhook_logs table in Supabase
 * Run this with: node setup-webhook-logs.js
 * 
 * Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupWebhookLogs() {
  console.log('🚀 Setting up webhook_logs table...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'supabase_webhook_logs.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement using Supabase RPC or direct query
    // Note: Supabase JS client doesn't support DDL directly, so we'll use the REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use Supabase REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql: statement })
        });

        if (!response.ok) {
          // Try alternative: direct SQL execution via pg REST API
          // This might not work - Supabase typically requires SQL editor
          console.log(`⚠️  Could not execute via RPC, trying alternative method...`);
          
          // Actually, Supabase doesn't expose DDL via REST API
          // We need to use the SQL editor or create tables via JS client
          console.log('⚠️  DDL statements must be run in Supabase SQL Editor');
          console.log('📋 Please run the SQL manually in Supabase Dashboard → SQL Editor\n');
          console.log('SQL to run:');
          console.log('─'.repeat(50));
          console.log(sql);
          console.log('─'.repeat(50));
          return;
        }
      } catch (error) {
        console.error(`Error executing statement:`, error.message);
      }
    }

    console.log('\n✅ Setup complete!');
  } catch (error) {
    console.error('❌ Error setting up webhook_logs:', error);
    console.log('\n📋 Please run the SQL manually in Supabase Dashboard → SQL Editor');
    console.log('File: supabase_webhook_logs.sql');
  }
}

setupWebhookLogs();





