import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function ClassAttendancePage() {
  const { classId } = useParams();
  const { teacher } = useAuth();
  const [studentSearch, setStudentSearch] = useState('');
  const [attendingStudents, setAttendingStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [noteModal, setNoteModal] = useState({ open: false, studentId: null, note: '' });
  const [createStudentModal, setCreateStudentModal] = useState({ open: false, name: '', email: '' });
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showCreateOption, setShowCreateOption] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchClassInfo();
      fetchAttendance();
    }
  }, [classId]);

  // Search for students by email or name as user types
  useEffect(() => {
    const searchStudents = async () => {
      if (studentSearch.trim().length < 2) {
        setEmailSuggestions([]);
        setShowSuggestions(false);
        setShowCreateOption(false);
        return;
      }

      setSearching(true);
      try {
        const searchTerm = studentSearch.trim();
        
        // Search both email and name fields
        const { data, error } = await supabase
          .from('students')
          .select('id, email, name')
          .or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .limit(10);

        if (!error && data) {
          // Filter out students already in attendance
          const filtered = data.filter(
            student => !attendingStudents.some(attending => attending.id === student.id)
          );
          setEmailSuggestions(filtered);
          setShowSuggestions(true);
          setShowCreateOption(true);
        } else {
          setEmailSuggestions([]);
          setShowSuggestions(true);
          setShowCreateOption(true);
        }
      } catch (err) {
        console.error('Error searching students:', err);
        setEmailSuggestions([]);
        setShowSuggestions(true);
        setShowCreateOption(true);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchStudents, 300);
    return () => clearTimeout(debounceTimer);
  }, [studentSearch, attendingStudents]);

  const handleCreateStudentClick = () => {
    setCreateStudentModal({ 
      open: true, 
      name: studentSearch.trim(), 
      email: '' 
    });
    setShowSuggestions(false);
  };

  const handleCreateStudent = async () => {
    if (!createStudentModal.name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nameTrimmed = createStudentModal.name.trim();
      const emailLower = createStudentModal.email.trim() ? createStudentModal.email.toLowerCase().trim() : null;

      // Check if student already exists by name
      const { data: existingByName } = await supabase
        .from('students')
        .select('*')
        .eq('name', nameTrimmed)
        .single();

      if (existingByName) {
        setError('A student with this name already exists.');
        setLoading(false);
        return;
      }

      // If email provided, check if it exists
      if (emailLower) {
        const { data: existingByEmail } = await supabase
          .from('students')
          .select('*')
          .eq('email', emailLower)
          .single();

        if (existingByEmail) {
          setError('A student with this email already exists.');
          setLoading(false);
          return;
        }
      }

      // Create new student
      const { data: newStudent, error: createError } = await supabase
        .from('students')
        .insert({
          name: nameTrimmed,
          email: emailLower
        })
        .select()
        .single();

      if (createError) throw createError;

      // Close modal and clear form
      setCreateStudentModal({ open: false, name: '', email: '' });
      setStudentSearch('');

      // Add the newly created student to attendance
      await addStudentToAttendance(newStudent);
    } catch (err) {
      console.error('Error creating student:', err);
      setError(err.message || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassInfo = async () => {
    try {
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      for (const tableName of tableNames) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', classId)
          .single();

        if (!error && data) {
          setClassInfo(data);
          
          // Fetch teacher information if teacher_id exists
          if (data.teacher_id) {
            const { data: teacherData, error: teacherError } = await supabase
              .from('teachers')
              .select('id, name, email')
              .eq('id', data.teacher_id)
              .single();

            if (!teacherError && teacherData) {
              setTeacherInfo(teacherData);
            }
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error fetching class info:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          student:students(*)
        `)
        .eq('class_id', classId);

      if (error) throw error;

      if (data) {
        const students = data.map((attendance) => ({
          id: attendance.student.id,
          email: attendance.student.email,
          name: attendance.student.name || attendance.student.email,
          attendanceId: attendance.id,
          note: attendance.note || ''
        }));
        setAttendingStudents(students);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    setStudentSearch(suggestion.name || suggestion.email);
    setShowSuggestions(false);
    setEmailSuggestions([]);
    
    // Automatically add the student
    await addStudentToAttendance(suggestion);
  };

  const addStudentToAttendance = async (student) => {
    setLoading(true);
    setError('');

    try {
      // Check if already added
      if (attendingStudents.some(s => s.id === student.id)) {
        setError('Student is already in the attendance list.');
        setLoading(false);
        return;
      }

      // Add to attendance table
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          class_id: classId,
          student_id: student.id
        })
        .select()
        .single();

      if (attendanceError) {
        // If already exists, fetch it
        if (attendanceError.code === '23505') {
          const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('class_id', classId)
            .eq('student_id', student.id)
            .single();

          if (existing) {
            setAttendingStudents([...attendingStudents, {
              id: student.id,
              email: student.email,
              name: student.name || student.email,
              attendanceId: existing.id,
              note: existing.note || ''
            }]);
            setStudentSearch('');
            setLoading(false);
            return;
          }
        }
        throw attendanceError;
      }

      // Add to local state
      setAttendingStudents([...attendingStudents, {
        id: student.id,
        email: student.email,
        name: student.name || student.email,
        attendanceId: attendance.id,
        note: ''
      }]);

      setStudentSearch('');
    } catch (err) {
      console.error('Error adding student:', err);
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentSearch.trim()) {
      setError('Please enter a student name or email');
      return;
    }

    setLoading(true);
    setError('');
    setShowSuggestions(false);
    setEmailSuggestions([]);

    try {
      const searchTerm = studentSearch.trim();

      // Check if student exists by name or email
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(1)
        .single();

      if (studentError || !student) {
        setError('Student not found. Please check the name or email address.');
        setLoading(false);
        return;
      }

      await addStudentToAttendance(student);
    } catch (err) {
      console.error('Error adding student:', err);
      setError(err.message || 'Failed to add student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    const student = attendingStudents.find(s => s.id === studentId);
    if (!student) return;

    // Show confirmation prompt
    const confirmed = window.confirm(
      `Are you sure you want to remove ${student.name || student.email} from this class attendance?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', student.attendanceId);

      if (error) throw error;

      setAttendingStudents(attendingStudents.filter(s => s.id !== studentId));
    } catch (err) {
      console.error('Error removing student:', err);
      setError('Failed to remove student');
    }
  };

  const handleOpenNoteModal = (studentId, currentNote = '') => {
    setNoteModal({ open: true, studentId, note: currentNote });
  };

  const handleSaveNote = async () => {
    try {
      const student = attendingStudents.find(s => s.id === noteModal.studentId);
      if (!student) return;

      const { error } = await supabase
        .from('attendance')
        .update({ note: noteModal.note })
        .eq('id', student.attendanceId);

      if (error) throw error;

      setAttendingStudents(attendingStudents.map(s => 
        s.id === noteModal.studentId 
          ? { ...s, note: noteModal.note }
          : s
      ));

      setNoteModal({ open: false, studentId: null, note: '' });
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note');
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
      <div className="max-w-4xl mx-auto">
        {/* Class Info Section */}
        {classInfo && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Class Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatDateTime(classInfo.date_time)}
                </p>
              </div>
              {classInfo.created_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Created</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatDateTime(classInfo.created_at)}
                  </p>
                </div>
              )}
            </div>
            {classInfo.note && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Class Note</p>
                <p className="text-gray-700">{classInfo.note}</p>
              </div>
            )}
            {teacherInfo && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Teacher</p>
                <p className="text-lg font-semibold text-gray-800">
                  {teacherInfo.name || teacherInfo.email}
                </p>
                {teacherInfo.email && teacherInfo.name && (
                  <p className="text-sm text-gray-500">{teacherInfo.email}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attendance Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Class Attendance
          </h1>

          <form onSubmit={handleAddStudent} className="mb-6">
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (emailSuggestions.length > 0 || studentSearch.trim().length >= 2) {
                      setShowSuggestions(true);
                      if (studentSearch.trim().length >= 2) {
                        setShowCreateOption(true);
                      }
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Enter student name or email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={loading}
                  autoComplete="off"
                />
                {showSuggestions && (emailSuggestions.length > 0 || showCreateOption) && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {emailSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                      >
                        <p className="font-medium text-gray-800">{suggestion.name || suggestion.email}</p>
                        <p className="text-sm text-gray-500">{suggestion.email}</p>
                      </div>
                    ))}
                    {showCreateOption && (
                      <div
                        onClick={handleCreateStudentClick}
                        className="px-4 py-2 hover:bg-green-50 cursor-pointer border-t-2 border-green-200 bg-green-50"
                      >
                        <p className="font-medium text-green-700">+ Create new student: {studentSearch}</p>
                        <p className="text-sm text-green-600">Click to add this student</p>
                      </div>
                    )}
                  </div>
                )}
                {searching && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Adding...' : 'Add Student'}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-red-600 text-sm">{error}</p>
            )}
          </form>

          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Attending Students ({attendingStudents.length})
            </h2>

            {attendingStudents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No students added yet.</p>
            ) : (
              <div className="space-y-3">
                {attendingStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                      {student.note && (
                        <p className="text-sm text-gray-600 mt-1 italic">Note: {student.note}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenNoteModal(student.id, student.note)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                      >
                        {student.note ? 'Edit Note' : 'Add Note'}
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Note Modal */}
      {noteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Note</h3>
            <textarea
              value={noteModal.note}
              onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
              placeholder="Enter note for this student..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows="4"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveNote}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setNoteModal({ open: false, studentId: null, note: '' })}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {createStudentModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={createStudentModal.name}
                  onChange={(e) => setCreateStudentModal({ ...createStudentModal, name: e.target.value })}
                  placeholder="Student name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={createStudentModal.email}
                  onChange={(e) => setCreateStudentModal({ ...createStudentModal, email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 text-red-600 text-sm">{error}</p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateStudent}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create & Add'}
              </button>
              <button
                onClick={() => {
                  setCreateStudentModal({ open: false, email: '', name: '' });
                  setError('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

