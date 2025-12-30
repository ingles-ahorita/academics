import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function StudentManagementPage() {
  const { teacher } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', weekly_classes: '' });
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentClasses, setStudentClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setStudents(allStudents);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = allStudents.filter(student => 
      student.email?.toLowerCase().includes(term) ||
      student.name?.toLowerCase().includes(term)
    );
    setStudents(filtered);
  }, [searchTerm, allStudents]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true });

      if (fetchError) throw fetchError;

      const studentsData = data || [];
      setAllStudents(studentsData);
      setStudents(studentsData);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentClasses = async (studentId) => {
    try {
      setLoadingClasses(true);
      
      // First get attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Try to fetch class data from different possible table names
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      const classes = [];

      for (const attendance of attendanceData || []) {
        let classData = null;
        
        for (const tableName of tableNames) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', attendance.class_id)
            .single();

          if (!error && data) {
            classData = data;
            break;
          }
        }

        if (classData) {
          classes.push({
            attendanceId: attendance.id,
            classId: classData.id,
            dateTime: classData.date_time,
            note: attendance.note || '',
            createdAt: attendance.created_at
          });
        }
      }

      setStudentClasses(classes);
    } catch (err) {
      console.error('Error fetching student classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEditClick = (student) => {
    setEditingStudent(student.id);
    setEditForm({
      name: student.name || '',
      email: student.email || '',
      weekly_classes: student.weekly_classes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setEditForm({ name: '', email: '', weekly_classes: '' });
  };

  const handleSaveEdit = async (studentId) => {
    try {
      setError('');
      
      if (!editForm.email.trim()) {
        setError('Email is required');
        return;
      }

      const classesPerWeek = editForm.weekly_classes === '' || editForm.weekly_classes === null 
        ? null 
        : parseInt(editForm.weekly_classes, 10);

      // Validate weekly_classes if provided
      if (editForm.weekly_classes !== '' && editForm.weekly_classes !== null) {
        if (isNaN(classesPerWeek) || classesPerWeek < 0) {
          setError('Classes per week must be a non-negative number');
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({
          name: editForm.name.trim() || null,
          email: editForm.email.toLowerCase().trim(),
          weekly_classes: classesPerWeek
        })
        .eq('id', studentId);

      if (updateError) throw updateError;

      // Update local state
      const updatedStudent = {
        ...students.find(s => s.id === studentId),
        name: editForm.name.trim() || null,
        email: editForm.email.toLowerCase().trim(),
        weekly_classes: classesPerWeek
      };
      
      setAllStudents(allStudents.map(s => 
        s.id === studentId ? updatedStudent : s
      ));
      setStudents(students.map(s => 
        s.id === studentId ? updatedStudent : s
      ));

      setEditingStudent(null);
      setEditForm({ name: '', email: '' });
    } catch (err) {
      console.error('Error updating student:', err);
      setError(err.message || 'Failed to update student');
    }
  };

  const handleViewClasses = async (student) => {
    if (viewingStudent === student.id) {
      setViewingStudent(null);
      setStudentClasses([]);
    } else {
      setViewingStudent(student.id);
      await fetchStudentClasses(student.id);
    }
  };

  const handleDeleteStudent = async (student) => {
    // Show confirmation prompt
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name || student.email}? This action cannot be undone and will also delete all their attendance records.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError('');

      // First delete all attendance records for this student
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .eq('student_id', student.id);

      if (attendanceError) {
        console.error('Error deleting attendance:', attendanceError);
        // Continue with student deletion even if attendance deletion fails
      }

      // Then delete the student
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);

      if (deleteError) throw deleteError;

      // Update local state
      setAllStudents(allStudents.filter(s => s.id !== student.id));
      setStudents(students.filter(s => s.id !== student.id));

      // If viewing this student's classes, close it
      if (viewingStudent === student.id) {
        setViewingStudent(null);
        setStudentClasses([]);
      }
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(err.message || 'Failed to delete student');
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
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Student Management
            </h1>
            <button
              onClick={() => navigate('/classes')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Back to Classes
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading students...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-gray-600">
                  {searchTerm ? `Found ${students.length} student(s)` : `Total Students: ${students.length}`}
                </p>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">No students found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      {editingStudent === student.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="Student name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="student@example.com"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Classes per Week
                            </label>
                            <input
                              type="number"
                              value={editForm.weekly_classes}
                              onChange={(e) => setEditForm({ ...editForm, weekly_classes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="Leave empty for unlimited"
                              min="0"
                              step="1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Leave empty or set to 0 for unlimited classes per week
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(student.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-800">
                                {student.name || 'No name'}
                              </h3>
                              <p className="text-gray-600">{student.email}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Classes per week: {student.weekly_classes === null || student.weekly_classes === undefined 
                                  ? 'Unlimited' 
                                  : `${student.weekly_classes} class${student.weekly_classes !== 1 ? 'es' : ''}`}
                              </p>
                              {student.created_at && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Created: {formatDateTime(student.created_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditClick(student)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleViewClasses(student)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                              >
                                {viewingStudent === student.id ? 'Hide Classes' : 'View Classes'}
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {/* Classes Attended Section */}
                          {viewingStudent === student.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="font-semibold text-gray-800 mb-3">
                                Classes Attended ({studentClasses.length})
                              </h4>
                              {loadingClasses ? (
                                <div className="text-center py-4">
                                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                              ) : studentClasses.length === 0 ? (
                                <p className="text-gray-500 text-sm">No classes attended yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {studentClasses.map((classItem, index) => (
                                    <div
                                      key={classItem.attendanceId || index}
                                      className="bg-gray-50 rounded-lg p-3"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-gray-800">
                                            {formatDateTime(classItem.dateTime)}
                                          </p>
                                          {classItem.note && (
                                            <p className="text-sm text-gray-600 mt-1 italic">
                                              Note: {classItem.note}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
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
    </div>
  );
}

