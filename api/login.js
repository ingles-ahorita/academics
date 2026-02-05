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

    // Parse the request body
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Missing required field: email is required'
      });
    }

    const teacherEmail = email.toLowerCase().trim();

    console.log('Login attempt for email:', teacherEmail);

    // Check if email exists in teachers table
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', teacherEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Email not found:', teacherEmail);
        return res.status(404).json({ 
          error: 'Email not found. Please check your email address.'
        });
      }
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({ 
        error: 'Email not found. Please check your email address.'
      });
    }

    console.log('Login successful for teacher:', data.id);

    return res.status(200).json({ 
      success: true,
      teacher: data
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
