import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import meetIcon from '../assets/meet.png';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherNames, setTeacherNames] = useState({});
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [classModal, setClassModal] = useState({ open: false, mode: 'create', classId: null, dateTime: '', level: '', note: '', teacherId: '', url: '' });
  const [savingClass, setSavingClass] = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [copiedUrlId, setCopiedUrlId] = useState(null);
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

  // Filter classes by level and teacher
  useEffect(() => {
    let filtered = allClasses;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(classItem => 
        classItem.level === selectedLevel || 
        String(classItem.level) === String(selectedLevel)
      );
    }

    // Filter by teacher (only for Managers)
    if (teacher?.role === 'Manager' && selectedTeacher !== 'all') {
      filtered = filtered.filter(classItem => 
        classItem.teacher_id === selectedTeacher ||
        String(classItem.teacher_id) === String(selectedTeacher)
      );
    }

    setClasses(filtered);
  }, [selectedLevel, selectedTeacher, allClasses, teacher]);

  const fetchClasses = async () => {
    if (!teacher) return;

    try {
      setLoading(true);
      setError(null);
      
      const isManager = teacher.role === 'Manager';
      console.log('Fetching classes for teacher:', teacher.id, 'Is Manager:', isManager);
      
      // Try common table names
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      let data = null;
      let fetchError = null;
      let successfulTable = null;

      for (const tableName of tableNames) {
        console.log(`Trying table: ${tableName}`);
        let query = supabase.from(tableName).select('*');
        
        // If not Manager, filter by teacher_id
        if (!isManager) {
          query = query.eq('teacher_id', teacher.id);
        }
        
        const result = await query;
        
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
        console.log(`No classes found${isManager ? '' : ` for teacher ${teacher.id}`}`);
      } else {
        console.log(`✅ Successfully loaded ${data.length} classes from table: ${successfulTable}`);
      }
      
      const classesData = data || [];
      setAllClasses(classesData);
      setClasses(classesData);
      
      // If Manager, fetch teacher names for all classes
      if (isManager && classesData.length > 0) {
        await fetchTeacherNames(classesData);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.message || 'Failed to load classes. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherNames = async (classesList) => {
    try {
      // Get unique teacher IDs
      const teacherIds = [...new Set(classesList.map(c => c.teacher_id).filter(Boolean))];
      
      if (teacherIds.length === 0) return;

      // Fetch all teachers at once
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('id, name, email')
        .in('id', teacherIds);

      if (error) {
        console.error('Error fetching teachers:', error);
        return;
      }

      // Create a map of teacher_id to teacher name
      const teacherMap = {};
      teachers.forEach(t => {
        teacherMap[t.id] = t.name || t.email;
      });

      setTeacherNames(teacherMap);
    } catch (err) {
      console.error('Error fetching teacher names:', err);
    }
  };

  const fetchAllTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, email')
        .order('name', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching all teachers:', err);
      return [];
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

  const formatCardTitle = (dateTimeString, level) => {
    if (!dateTimeString) return 'Class Session';
    
    const date = new Date(dateTimeString);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const time = `${displayHours}:${displayMinutes} ${ampm}`;
    
    const datePart = `${dayOfWeek}, ${month} ${day}, ${time}`;
    const levelPart = level ? ` - ${level}` : '';
    
    return `${datePart}${levelPart}`;
  };

  const groupClassesByDate = (classesList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(endOfThisWeek.getDate() + 7);
    
    const endOfNextWeek = new Date(today);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 14);

    const groups = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
      previous: []
    };

    classesList.forEach((classItem) => {
      // If no date_time, add to "later"
      if (!classItem.date_time) {
        groups.later.push(classItem);
        return;
      }
      
      const classDate = new Date(classItem.date_time);
      classDate.setHours(0, 0, 0, 0);

      // Check if class is in the past
      if (classDate.getTime() < today.getTime()) {
        groups.previous.push(classItem);
      } else if (classDate.getTime() === today.getTime()) {
        groups.today.push(classItem);
      } else if (classDate.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(classItem);
      } else if (classDate > tomorrow && classDate <= endOfThisWeek) {
        groups.thisWeek.push(classItem);
      } else if (classDate > endOfThisWeek && classDate <= endOfNextWeek) {
        groups.nextWeek.push(classItem);
      } else {
        // Future classes beyond next week
        groups.later.push(classItem);
      }
    });

    // Sort each group by time
    const sortByTime = (a, b) => {
      const timeA = a.date_time ? new Date(a.date_time).getTime() : 0;
      const timeB = b.date_time ? new Date(b.date_time).getTime() : 0;
      return timeA - timeB;
    };

    const sortByTimeDesc = (a, b) => {
      const timeA = a.date_time ? new Date(a.date_time).getTime() : 0;
      const timeB = b.date_time ? new Date(b.date_time).getTime() : 0;
      return timeB - timeA; // Descending for previous classes (most recent first)
    };

    groups.today.sort(sortByTime);
    groups.tomorrow.sort(sortByTime);
    groups.thisWeek.sort(sortByTime);
    groups.nextWeek.sort(sortByTime);
    groups.later.sort(sortByTime);
    groups.previous.sort(sortByTimeDesc); // Most recent previous classes first

    return groups;
  };

  const handleTakeAttendance = (classId) => {
    window.open(`/manage-class/${classId}/attendance`, '_blank');
  };

  const handleOpenCreateModal = async () => {
    setClassModal({ 
      open: true,
      mode: 'create',
      classId: null,
      dateTime: '', 
      level: '', 
      note: '', 
      teacherId: teacher.role === 'Manager' ? '' : teacher.id,
      url: ''
    });
    
    // If Manager, fetch all teachers for the dropdown
    if (teacher.role === 'Manager') {
      setLoadingTeachers(true);
      const teachers = await fetchAllTeachers();
      setAllTeachers(teachers);
      setLoadingTeachers(false);
    }
  };

  const handleOpenEditModal = async (classItem) => {
    // Convert UTC datetime to local datetime-local format
    const localDate = classItem.date_time ? new Date(classItem.date_time) : new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;

    setClassModal({ 
      open: true,
      mode: 'edit',
      classId: classItem.id,
      dateTime: localDateTimeString, 
      level: classItem.level || '', 
      note: classItem.note || '', 
      teacherId: classItem.teacher_id || (teacher.role === 'Manager' ? '' : teacher.id),
      url: classItem.url || ''
    });
    
    // If Manager, fetch all teachers for the dropdown
    if (teacher.role === 'Manager') {
      setLoadingTeachers(true);
      const teachers = await fetchAllTeachers();
      setAllTeachers(teachers);
      setLoadingTeachers(false);
    }
  };

  const getAvailableLevels = () => {
    // Always return the 3 fixed level options
    return ['Basic', 'Intermediate', 'Advanced'];
  };

  const handleSaveClass = async () => {
    if (!classModal.dateTime) {
      setError('Date and time are required');
      return;
    }

    if (!classModal.level) {
      setError('Level is required');
      return;
    }

    if (teacher.role === 'Manager' && !classModal.teacherId) {
      setError('Please select a teacher');
      return;
    }

    if (classModal.mode === 'edit' && !classModal.classId) {
      setError('Class ID is missing');
      return;
    }

    setSavingClass(true);
    setError(null);

    try {
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      let success = false;
      let saveError = null;

      // Convert local datetime to ISO string with timezone offset
      const localDate = new Date(classModal.dateTime);
      const dateTimeISO = localDate.toISOString();
      
      // Calculate end time (default to 1 hour after start, or use provided end time)
      const endDate = new Date(localDate);
      endDate.setHours(endDate.getHours() + 1);
      const endTimeISO = endDate.toISOString();

      const teacherId = teacher.role === 'Manager' && classModal.teacherId 
        ? classModal.teacherId 
        : teacher.id;

      // If creating a new class, try to generate Google Meet link automatically
      let meetLink = classModal.url; // Use provided URL if editing or if user provided one
      
      if (classModal.mode === 'create' && !classModal.url) {
        try {
          // Call Google Calendar API to create event and get Meet link
          const isDevelopment = import.meta.env.DEV;
          const apiUrl = import.meta.env.VITE_API_URL || 
            (isDevelopment ? 'http://localhost:3000/api/create-calendar-event' : '/api/create-calendar-event');
          
          const calendarResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: `${classModal.level} Class`,
              description: classModal.note || `Class session for ${classModal.level} level`,
              startTime: dateTimeISO,
              endTime: endTimeISO,
            }),
          });

          if (calendarResponse.ok) {
            const calendarData = await calendarResponse.json();
            if (calendarData.success && calendarData.event.meetLink) {
              meetLink = calendarData.event.meetLink;
              console.log('✅ Google Meet link generated:', meetLink);
            } else {
              console.warn('Calendar event created but no Meet link returned');
            }
          } else {
            const errorData = await calendarResponse.json().catch(() => ({}));
            console.warn('Failed to create calendar event:', errorData.error || 'Unknown error');
            // Continue without Meet link - user can add it manually
          }
        } catch (calendarError) {
          console.error('Error calling calendar API:', calendarError);
          // Continue without Meet link - user can add it manually
        }
      }

      // If still no URL after trying to generate, allow user to continue
      // They can add it manually later by editing the class
      if (!meetLink && classModal.mode === 'create') {
        console.warn('No Meet link available. Class will be created without URL.');
        // Don't block creation - user can add URL later by editing
      }

      const classData = {
        date_time: dateTimeISO,
        level: classModal.level || null,
        note: classModal.note || null,
        url: meetLink || null,
        teacher_id: teacherId
      };

      // Add created_by field only when creating (not editing)
      if (classModal.mode === 'create') {
        classData.created_by = teacherId;
      }

      for (const tableName of tableNames) {
        let result;
        
        if (classModal.mode === 'edit') {
          result = await supabase
            .from(tableName)
            .update(classData)
            .eq('id', classModal.classId)
            .select()
            .single();
        } else {
          result = await supabase
            .from(tableName)
            .insert(classData)
            .select()
            .single();
        }

        if (!result.error && result.data) {
          success = true;
          // Refresh classes list
          await fetchClasses();
          // Close modal and reset form
          setClassModal({ open: false, mode: 'create', classId: null, dateTime: '', level: '', note: '', teacherId: '', url: '' });
          setError(null);
          break;
        } else if (result.error && result.error.code !== 'PGRST116') {
          saveError = result.error;
          break;
        }
      }

      if (!success && saveError) {
        throw saveError;
      }
    } catch (err) {
      console.error(`Error ${classModal.mode === 'edit' ? 'updating' : 'creating'} class:`, err);
      setError(err.message || `Failed to ${classModal.mode === 'edit' ? 'update' : 'create'} class`);
    } finally {
      setSavingClass(false);
    }
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
              {teacher.role === 'Manager' ? 'All Classes' : 'My Classes'}
            </h1>
            <p className="text-gray-600">
              Welcome, {teacher.email}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Create Class
            </button>
            <button
              onClick={() => navigate('/students')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Student Management
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
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
            {/* Filters */}
            {allClasses.length > 0 && (() => {
              // Get unique levels from all classes
              const levels = [...new Set(allClasses.map(c => c.level).filter(Boolean))].sort();
              
              // Get unique teachers (only for Managers)
              const teachers = teacher?.role === 'Manager' 
                ? [...new Set(allClasses.map(c => c.teacher_id).filter(Boolean))]
                : [];
              
              return (
                <div className="mb-6 bg-white rounded-lg shadow-md p-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Level Filter */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 text-sm">Level:</span>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => setSelectedLevel('all')}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            selectedLevel === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          All
                        </button>
                        {levels.map((level) => (
                          <button
                            key={level}
                            onClick={() => setSelectedLevel(level)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                              selectedLevel === level
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Teacher Filter Dropdown (only for Managers) */}
                    {teacher?.role === 'Manager' && teachers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700 text-sm">Teacher:</span>
                        <select
                          value={selectedTeacher}
                          onChange={(e) => setSelectedTeacher(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                        >
                          <option value="all">All Teachers</option>
                          {teachers.map((teacherId) => (
                            <option key={teacherId} value={teacherId}>
                              {teacherNames[teacherId] || `Teacher ${teacherId}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 text-lg">
                  {selectedLevel === 'all' && selectedTeacher === 'all'
                    ? 'No classes found.' 
                    : `No classes found${selectedLevel !== 'all' ? ` for level ${selectedLevel}` : ''}${selectedTeacher !== 'all' ? ` for ${teacherNames[selectedTeacher] || 'selected teacher'}` : ''}.`}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {selectedLevel === 'all' && selectedTeacher === 'all'
                    ? 'You don\'t have any classes assigned yet.'
                    : 'Try selecting different filters or "All".'}
                </p>
              </div>
            ) : (
              (() => {
                const grouped = groupClassesByDate(classes);
                console.log('Grouped classes:', grouped);
                console.log('Total classes:', classes.length);
                
                const sections = [
                  { title: 'Today', classes: grouped.today },
                  { title: 'Tomorrow', classes: grouped.tomorrow },
                  { title: 'This Week', classes: grouped.thisWeek },
                  { title: 'Next Week', classes: grouped.nextWeek },
                  { title: 'Later', classes: grouped.later },
                  { title: 'Previous Classes', classes: grouped.previous }
                ];

                // Filter out empty sections
                const nonEmptySections = sections.filter(section => section.classes.length > 0);
                console.log('Non-empty sections:', nonEmptySections);

                if (nonEmptySections.length === 0) {
                  return (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                      <p className="text-gray-600 text-lg">No classes found.</p>
                      <p className="text-sm text-gray-500 mt-2">You don't have any classes assigned yet.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-8">
                    {nonEmptySections.map((section) => (
                      <div key={section.title}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{section.title}</h2>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {section.classes.map((classItem) => (
                            <div
                              key={classItem.id}
                              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                              <div className="mb-4">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                  {formatCardTitle(classItem.date_time, classItem.level)}
                                </h3>
                                {teacher.role === 'Manager' && classItem.teacher_id && teacherNames[classItem.teacher_id] && (
                                  <div className="text-sm text-gray-600 mb-2">
                                    <span className="font-medium">Teacher:</span>{' '}
                                    {teacherNames[classItem.teacher_id]}
                                  </div>
                                )}
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

                              <div className="mt-4 flex gap-2">
                                <button
                                  onClick={() => handleOpenEditModal(classItem)}
                                  className="px-2.5 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                  title="Edit Class"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleTakeAttendance(classItem.id)}
                                  className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                >
                                  Take Attendance
                                </button>
                                <button
                                  onClick={async () => {
                                      try {
                                        const publicId = classItem.public_id || classItem.id;
                                        const urlToCopy = `https://academic.inglesahorita.com/class/${publicId}`;
                                        await navigator.clipboard.writeText(urlToCopy);
                                        setCopiedUrlId(classItem.id);
                                        setTimeout(() => setCopiedUrlId(null), 2000);
                                      } catch (err) {
                                        console.error('Failed to copy URL:', err);
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg transition ${
                                      copiedUrlId === classItem.id
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                    title={copiedUrlId === classItem.id ? 'Copied!' : 'Copy URL'}
                                  >
                                    {copiedUrlId === classItem.id ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                    )}
                                  </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </>
        )}
      </div>

      {/* Create/Edit Class Modal */}
      {classModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {classModal.mode === 'edit' ? 'Edit Class' : 'Create New Class'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={classModal.dateTime}
                  onChange={(e) => setClassModal({ ...classModal, dateTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  disabled={savingClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level *
                </label>
                <select
                  value={classModal.level}
                  onChange={(e) => setClassModal({ ...classModal, level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                  disabled={savingClass}
                >
                  <option value="">Select a level</option>
                  {getAvailableLevels().map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              {teacher?.role === 'Manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher *
                  </label>
                  {loadingTeachers ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-500">
                      Loading teachers...
                    </div>
                  ) : (
                    <select
                      value={classModal.teacherId}
                      onChange={(e) => setClassModal({ ...classModal, teacherId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                      disabled={savingClass}
                    >
                      <option value="">Select a teacher</option>
                      {allTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || t.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL {classModal.mode === 'create' ? '(Auto-generated if empty)' : '*'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={classModal.url}
                    onChange={(e) => setClassModal({ ...classModal, url: e.target.value })}
                    placeholder={classModal.mode === 'create' ? 'Will be auto-generated from Google Calendar' : 'https://example.com/class'}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required={classModal.mode === 'edit'}
                    disabled={savingClass}
                  />
                  <button
                    type="button"
                    onClick={() => window.open('https://meet.google.com', '_blank')}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center"
                    title="Open Google Meet"
                    disabled={savingClass}
                  >
                    <img src={meetIcon} alt="Google Meet" className="h-5 w-5" />
                  </button>
                </div>
                {classModal.mode === 'create' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to automatically generate a Google Meet link from Google Calendar
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (Optional)
                </label>
                <textarea
                  value={classModal.note}
                  onChange={(e) => setClassModal({ ...classModal, note: e.target.value })}
                  placeholder="Class notes or description..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows="3"
                  disabled={savingClass}
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 text-red-600 text-sm">{error}</p>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveClass}
                disabled={savingClass || !classModal.dateTime || !classModal.level || (classModal.mode === 'edit' && !classModal.url) || (teacher?.role === 'Manager' && !classModal.teacherId)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingClass 
                  ? (classModal.mode === 'edit' ? 'Updating...' : 'Creating class and Meet link...') 
                  : (classModal.mode === 'edit' ? 'Update Class' : 'Create Class')}
              </button>
              <button
                onClick={() => {
                  setClassModal({ open: false, mode: 'create', classId: null, dateTime: '', level: '', note: '', teacherId: '', url: '' });
                  setError(null);
                }}
                disabled={savingClass}
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

