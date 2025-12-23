import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ClassRedirectPage() {
  const { classId } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const redirect = async () => {
      if (!classId) {
        setError('No class ID provided');
        return;
      }

      console.log('Looking up class with ID:', classId);

      // Try common table names
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      let classData = null;

      for (const tableName of tableNames) {
        console.log(`Trying table: ${tableName}`);

        // First try by public_id
        let { data, error } = await supabase
          .from(tableName)
          .select('url, id, public_id')
          .eq('public_id', classId)
          .maybeSingle();

        console.log(`Result for ${tableName} (public_id):`, { data, error });

        // If not found, try by id
        if (!data && (!error || error.code !== 'PGRST116')) {
          const result = await supabase
            .from(tableName)
            .select('url, id, public_id')
            .eq('id', classId)
            .maybeSingle();
          data = result.data;
          error = result.error;
          console.log(`Result for ${tableName} (id):`, { data, error });
        }

        // If table doesn't exist, try next
        if (error && error.code === 'PGRST116') {
          console.log(`Table ${tableName} doesn't exist, trying next...`);
          continue;
        }

        // If we found data, use it
        if (data && !error) {
          classData = data;
          console.log(`✅ Found class in ${tableName}:`, classData);
          break;
        }
      }

      if (!classData) {
        console.error('Class not found in any table');
        setError('Class not found');
        return;
      }

      if (classData.url) {
        console.log('Redirecting to:', classData.url);
        window.location.href = classData.url;
      } else {
        console.error('No URL found for class');
        setError('No URL found for this class');
      }
    };

    redirect();
  }, [classId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Class ID: {classId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
        <p className="text-sm text-gray-500 mt-2">Class ID: {classId}</p>
      </div>
    </div>
  );
}

