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
    // Initialize Supabase client with service role key for server-side operations
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

    // Extract customer information from Kajabi webhook
    // Kajabi webhook structure may vary, adjust based on your Kajabi webhook format
    let customerEmail = null;
    let customerName = null;

    // Try different possible payload structures
    if (payload.customer) {
      customerEmail = payload.customer.email || payload.customer.email_address;
      customerName = payload.customer.first_name || payload.customer.name || 
                    (payload.customer.first_name && payload.customer.last_name 
                      ? `${payload.customer.first_name} ${payload.customer.last_name}`.trim()
                      : null);
    } else if (payload.email) {
      customerEmail = payload.email;
      customerName = payload.name || payload.first_name || 
                    (payload.first_name && payload.last_name 
                      ? `${payload.first_name} ${payload.last_name}`.trim()
                      : null);
    } else if (payload.purchase) {
      customerEmail = payload.purchase.customer?.email || payload.purchase.email;
      customerName = payload.purchase.customer?.name || 
                    payload.purchase.customer?.first_name ||
                    (payload.purchase.customer?.first_name && payload.purchase.customer?.last_name
                      ? `${payload.purchase.customer.first_name} ${payload.purchase.customer.last_name}`.trim()
                      : null);
    }

    // Validate that we have at least an email or name
    if (!customerEmail && !customerName) {
      console.error('No customer email or name found in webhook payload');
      return res.status(400).json({ 
        error: 'Missing customer information',
        received: Object.keys(payload)
      });
    }

    // Normalize email to lowercase if provided
    const emailLower = customerEmail ? customerEmail.toLowerCase().trim() : null;
    const nameTrimmed = customerName ? customerName.trim() : null;

    // Check if student already exists
    let existingStudent = null;
    
    if (emailLower) {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();
      existingStudent = data;
    }

    // If not found by email, check by name
    if (!existingStudent && nameTrimmed) {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('name', nameTrimmed)
        .maybeSingle();
      existingStudent = data;
    }

    // If student already exists, return success (idempotent)
    if (existingStudent) {
      console.log('Student already exists:', existingStudent.id);
      return res.status(200).json({ 
        message: 'Student already exists',
        student: existingStudent
      });
    }

    // Create new student
    const studentData = {};
    if (nameTrimmed) {
      studentData.name = nameTrimmed;
    }
    if (emailLower) {
      studentData.email = emailLower;
    }

    // Ensure we have at least a name (required field)
    if (!studentData.name) {
      // Use email as name if no name provided
      studentData.name = emailLower || 'Student';
    }

    const { data: newStudent, error: createError } = await supabase
      .from('students')
      .insert(studentData)
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

