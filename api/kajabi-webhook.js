import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the webhook payload from Kajabi
    const payload = req.body;
    
    console.log('Kajabi webhook received:', JSON.stringify(payload, null, 2));

    // Store the entire payload in webhook_inbounds table
    const { data: storedPayload, error: storeError } = await supabase
      .from('webhook_inbounds')
      .insert({
        payload: payload
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing webhook payload:', storeError);
      return res.status(500).json({ 
        error: 'Failed to store webhook payload',
        details: storeError.message
      });
    }

    console.log('Payload stored successfully:', storedPayload.id);

    return res.status(200).json({ 
      message: 'Webhook received and stored',
      id: storedPayload.id
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
