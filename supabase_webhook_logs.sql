-- Create webhook_logs table to store all webhook requests
-- Run this SQL in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS webhook_logs (
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
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_code ON webhook_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_method ON webhook_logs(method);

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to insert logs
CREATE POLICY "Allow service role to insert webhook logs"
  ON webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy to allow authenticated users to read logs (adjust as needed)
CREATE POLICY "Allow authenticated users to read webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Optional: Create a view for easier querying
CREATE OR REPLACE VIEW webhook_logs_summary AS
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
ORDER BY timestamp DESC;






