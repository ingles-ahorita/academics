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
    const { email, name, weekly_classes } = req.body;

    if (!email || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: email and name are required'
      });
    }

    const studentEmail = email.toLowerCase().trim();
    const studentName = name.trim();
    const weeklyClasses = weekly_classes || 0;

    console.log('Creating student:', { email: studentEmail, name: studentName, weekly_classes: weeklyClasses });

    // Check if student already exists by email
    const { data: existingStudent } = await supabase
      .from('students')
      .select('*')
      .eq('email', studentEmail)
      .maybeSingle();

    if (existingStudent) {
      // Update existing student with weekly_classes if provided
      if (weeklyClasses !== undefined && weeklyClasses !== null) {
        const { data: updatedStudent, error: updateError } = await supabase
          .from('students')
          .update({ 
            name: studentName,
            weekly_classes: weeklyClasses
          })
          .eq('id', existingStudent.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating student:', updateError);
          return res.status(500).json({ 
            error: 'Failed to update student',
            details: updateError.message
          });
        }

        console.log('Student updated:', updatedStudent.id);
        return res.status(200).json({ 
          message: 'Student updated successfully',
          student: updatedStudent
        });
      }

      console.log('Student already exists:', existingStudent.id);
      return res.status(200).json({ 
        message: 'Student already exists',
        student: existingStudent
      });
    }

    // Create new student
    const studentData = {
      name: studentName,
      email: studentEmail,
      weekly_classes: weeklyClasses
    };

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
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

