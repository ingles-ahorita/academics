import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { teacher, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!teacher) {
      navigate('/');
    }
  }, [teacher, navigate]);

  useEffect(() => {
    if (teacher) {
      fetchClasses();
    }
  }, [teacher]);

  const fetchClasses = async () => {
    if (!teacher) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching classes for teacher:', teacher.id);
      
      // Try common table names
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      let data = null;
      let fetchError = null;
      let successfulTable = null;

      for (const tableName of tableNames) {
        console.log(`Trying table: ${tableName}`);
        const result = await supabase
          .from(tableName)
          .select('*')
          .eq('teacher_id', teacher.id);
        
        console.log(`Result for ${tableName}:`, { data: result.data, error: result.error, count: result.data?.length });
        
        if (result.error) {
          // If it's a "relation does not exist" error, try next table
          if (result.error.code === 'PGRST116' || result.error.message?.includes('does not exist')) {
            console.log(`Table ${tableName} does not exist, trying next...`);
            continue;
          }
          // Other errors, throw them
          fetchError = result.error;
          break;
        }
        
        if (result.data) {
          data = result.data;
          successfulTable = tableName;
          console.log(`✅ Found data in table: ${tableName}`, data);
          break;
        }
      }

      if (fetchError && !data) {
        console.error('Supabase error:', fetchError);
        throw fetchError;
      }
      
      if (!data || data.length === 0) {
        console.log(`No classes found for teacher ${teacher.id}`);
      } else {
        console.log(`✅ Successfully loaded ${data.length} classes from table: ${successfulTable}`);
      }
      
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.message || 'Failed to load classes. Check console for details.');
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!teacher) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              My Classes
            </h1>
            <p className="text-gray-600">
              Welcome, {teacher.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Logout
          </button>
        </div>

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
          </div>
        )}

        {!loading && !error && (
          <>
            {classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 text-lg">No classes found.</p>
                <p className="text-sm text-gray-500 mt-2">You don't have any classes assigned yet.</p>
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

