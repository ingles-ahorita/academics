import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LandingPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch classes from the database
      // Update 'classes' to your actual table name if different
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .order('date_time', { ascending: true });

      if (fetchError) throw fetchError;
      
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          Academic Classes
        </h1>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading classes...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error loading classes:</p>
            <p>{error}</p>
            <p className="text-sm mt-2">Make sure your table is named 'classes' or update the table name in LandingPage.jsx</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 text-lg">No classes found in the database.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Class Session
                      </h3>
                      <div className="text-sm text-gray-500 mb-1">
                        <span className="font-medium">Date & Time:</span>{' '}
                        {formatDateTime(classItem.date_time)}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Created:</span>{' '}
                        {formatDateTime(classItem.created_at)}
                      </div>
                    </div>
                    
                    {classItem.note && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-gray-700">{classItem.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

