import { createClient } from "@supabase/supabase-js";

// Academic app - uses academic database credentials
const getSupabaseUrl = () => {
  // Check import.meta.env first (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  // Fallback to process.env
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
};

const getSupabaseKey = () => {
  // Check import.meta.env first (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  // Fallback to process.env
  return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
};

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

// Better error messages
if (!supabaseUrl) {
  console.error('Supabase URL is missing. Current env:', {
    VITE_SUPABASE_URL: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : 'N/A',
    processEnv: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'N/A'
  });
  throw new Error('Supabase URL is missing. Please set VITE_SUPABASE_URL in your .env file.');
}

if (!supabaseKey) {
  console.error('Supabase Key is missing. Current env:', {
    VITE_SUPABASE_ANON_KEY: typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : 'N/A',
    processEnv: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'N/A'
  });
  throw new Error('Supabase Key is missing. Please set VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Validate URL format
if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  throw new Error(`Invalid Supabase URL format: "${supabaseUrl}". Must start with http:// or https://`);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:
      typeof window === 'undefined' ? false : true
  }
});


