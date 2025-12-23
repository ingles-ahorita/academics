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

    // Store the entire payload in webhook_inbounds table for monitoring
    const { data: storedPayload, error: storeError } = await supabase
      .from('webhook_inbounds')
      .insert({
        payload: payload
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing webhook payload:', storeError);
      // Continue processing even if storage fails
    } else {
      console.log('Payload stored successfully:', storedPayload.id);
    }

    // Extract customer information from Kajabi payload
    // Structure: { id, event, payload: { member_email, member_name, member_first_name, member_last_name, ... } }
    if (!payload.payload || !payload.payload.member_email) {
      console.error('Missing member_email in payload');
      return res.status(400).json({ 
        error: 'Missing member_email in payload',
        received: Object.keys(payload)
      });
    }

    const customerEmail = payload.payload.member_email.toLowerCase().trim();
    const firstName = payload.payload.member_first_name || '';
    const lastName = payload.payload.member_last_name || '';
    const memberName = payload.payload.member_name || '';
    const customerName = memberName || `${firstName} ${lastName}`.trim() || customerEmail;

    // Check if student already exists by email
    const { data: existingStudent } = await supabase
      .from('students')
      .select('*')
      .eq('email', customerEmail)
      .maybeSingle();

    if (existingStudent) {
      console.log('Student already exists:', existingStudent.id);
      return res.status(200).json({ 
        message: 'Student already exists',
        student: existingStudent
      });
    }

    // Create new student
    const { data: newStudent, error: createError } = await supabase
      .from('students')
      .insert({
        name: customerName,
        email: customerEmail
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating student:', createError);
      return res.status(500).json({ 
        error: 'Failed to create student',
        details: createError.message
      });
    }

    console.log('Student created successfully:', newStudent.id);

    return res.status(200).json({ 
      message: 'Student created successfully',
      student: newStudent
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
