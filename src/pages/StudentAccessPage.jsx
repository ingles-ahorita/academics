import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function StudentAccessPage() {
  const { classId } = useParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [weeklyAttendanceCount, setWeeklyAttendanceCount] = useState(null);
  const [maxClassesPerWeek, setMaxClassesPerWeek] = useState(null);
  const [showingAttendance, setShowingAttendance] = useState(false);
  const [attendedClassesThisWeek, setAttendedClassesThisWeek] = useState([]);
  const {teacher} = useAuth();

  useEffect(() => {
    if (teacher) {
      redirectToClass();
    }
  }, [teacher]);  

  // Calculate start and end of current week (Monday to Saturday) in UTC
  // Week resets at midnight from Sunday to Monday UTC
  // Sunday classes count as previous week
  const getWeekBounds = () => {
    const now = new Date();
    
    // Get UTC day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const utcDay = now.getUTCDay();
    // Calculate days to subtract to get to Monday
    // 0 = Sunday -> -6 (go back 6 days to get to previous Monday)
    // 1 = Monday -> 0 (already Monday)
    // 2 = Tuesday -> -1, etc.
    const daysToMonday = utcDay === 0 ? -6 : 1 - utcDay;
    
    // Create start of week in UTC (Monday 00:00:00.000)
    const startOfWeek = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysToMonday,
      0, 0, 0, 0
    ));
    
    // Create end of week in UTC (Saturday 23:59:59.999)
    // Sunday classes belong to previous week
    const endOfWeek = new Date(Date.UTC(
      startOfWeek.getUTCFullYear(),
      startOfWeek.getUTCMonth(),
      startOfWeek.getUTCDate() + 6,
      23, 59, 59, 0
    ));
    
    return { startOfWeek, endOfWeek };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor ingresa tu dirección de correo electrónico');
      return;
    }

    setLoading(true);
    setError('');
    setChecking(true);
    setShowingAttendance(false);
    setAttendedClassesThisWeek([]);
    setWeeklyAttendanceCount(null);

    try {
      // TEMPORARY: Bypass all authentication - allow any email
      console.log('⚠️ TEMPORARY: Bypassing authentication for email:', email);
      
      // Skip all student validation and weekly limit checks
      // Just redirect directly to the class
      setChecking(false);
      setShowingAttendance(true);
      setWeeklyAttendanceCount(0);
      setMaxClassesPerWeek(null);
      
      // Wait 2 seconds to show the attendance message, then redirect
      setTimeout(async () => {
        await redirectToClass();
      }, 2000);

      // ORIINAL CODE COMMENTED OUT FOR TEMPORARY BYPASS:
      /*
      // Find the student by email
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (studentError) throw studentError;

      if (!student) {
        setError('Estudiante no encontrado. Por favor verifica tu dirección de correo electrónico.');
        setLoading(false);
        setChecking(false);
        return;
      }

      // Get max classes per week
      // null/undefined = unlimited, 0 = 0 classes, other numbers = that many classes
      const maxClasses = student.weekly_classes === null || student.weekly_classes === undefined 
        ? null 
        : student.weekly_classes;
      setMaxClassesPerWeek(maxClasses);

      // Get week bounds
      const { startOfWeek, endOfWeek } = getWeekBounds();
      
      console.log('📅 Week bounds (UTC):', {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString(),
        startLocal: startOfWeek.toLocaleString(),
        endLocal: endOfWeek.toLocaleString()
      });

      // Get all attendance records for this student
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('class_id, created_at')
        .eq('student_id', student.id);

      if (attendanceError) throw attendanceError;

      console.log('📋 Student attendance records:', {
        studentId: student.id,
        studentEmail: student.email,
        totalRecords: attendanceData?.length || 0,
        records: attendanceData
      });

      // Count classes that fall within the current week based on class date_time
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      let count = 0;
      const classesList = [];

      if (attendanceData && attendanceData.length > 0) {
        // Get unique class IDs
        const classIds = [...new Set(attendanceData.map(a => a.class_id).filter(Boolean))];
        
        console.log('🔍 Checking classes:', {
          uniqueClassIds: classIds,
          totalUniqueClasses: classIds.length
        });
        
        // Check each class to see if its date_time falls within the current week
        for (const classId of classIds) {
          let classFound = false;
          let classInfo = null;
          
          for (const tableName of tableNames) {
            const { data: classData, error: classError } = await supabase
              .from(tableName)
              .select('id, date_time, level, url')
              .eq('id', classId)
              .maybeSingle();

            if (!classError && classData) {
              classInfo = classData;
              
              if (classData.date_time) {
                const classDate = new Date(classData.date_time);
                
                console.log(`📚 Class ${classId} (from ${tableName}):`, {
                  classId: classId,
                  dateTime: classData.date_time,
                  dateTimeLocal: classDate.toLocaleString(),
                  dateTimeUTC: classDate.toISOString(),
                  isInWeek: classDate >= startOfWeek && classDate <= endOfWeek,
                  weekStart: startOfWeek.toISOString(),
                  weekEnd: endOfWeek.toISOString()
                });
                
                // Check if class date_time falls within the current week (Sunday to Saturday in UTC)
                if (classDate >= startOfWeek && classDate <= endOfWeek) {
                  count++;
                  classesList.push({
                    classId: classId,
                    dateTime: classData.date_time,
                    level: classData.level,
                    url: classData.url
                  });
                  classFound = true;
                  break;
                }
              } else {
                console.log(`⚠️ Class ${classId} (from ${tableName}) has no date_time`);
              }
              
              // If we found the class (even if outside the week), break to avoid checking other tables
              break;
            }
          }
          
          if (!classInfo) {
            console.log(`❌ Class ${classId} not found in any table`);
          }
        }
      }

      console.log('✅ Weekly attendance summary:', {
        studentEmail: student.email,
        weeklyClassesLimit: maxClasses,
        classesAttendedThisWeek: count,
        attendedClasses: classesList
      });

      setWeeklyAttendanceCount(count);
      setAttendedClassesThisWeek(classesList);

      // Check if student has reached their limit (only if limit is set and not null/unlimited)
      if (maxClasses !== null && maxClasses !== undefined && maxClasses > 0 && count >= maxClasses) {
        setError(
          `Ya has asistido a ${count} clase${count !== 1 ? 's' : ''} esta semana. ` +
          `Tu límite es de ${maxClasses} clase${maxClasses !== 1 ? 's' : ''} por semana. ` +
          `Por favor espera hasta la próxima semana para acceder a más clases.`
        );
        setLoading(false);
        setChecking(false);
        return;
      }

      // Show attendance count before redirecting
      setChecking(false);
      setShowingAttendance(true);
      
      // Wait 2 seconds to show the attendance message, then redirect
      setTimeout(async () => {
        await redirectToClass();
      }, 2000);
      */
    } catch (err) {
      console.error('Error checking access:', err);
      setError(err.message || 'Ocurrió un error. Por favor intenta de nuevo.');
      setLoading(false);
      setChecking(false);
    }
  };

  const redirectToClass = async () => {
    try {
      setChecking(false);
      setLoading(true);

      // Find the class URL using the same logic as the original redirect
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];
      let classData = null;

      for (const tableName of tableNames) {
        // First try by public_id
        let { data, error } = await supabase
          .from(tableName)
          .select('url, id, public_id')
          .eq('public_id', classId)
          .maybeSingle();

        // If not found, try by id
        if (!data && (!error || error.code !== 'PGRST116')) {
          const result = await supabase
            .from(tableName)
            .select('url, id, public_id')
            .eq('id', classId)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }

        // If table doesn't exist, try next
        if (error && error.code === 'PGRST116') {
          continue;
        }

        // If we found data, use it
        if (data && !error) {
          classData = data;
          break;
        }
      }

      if (!classData) {
        setError('Clase no encontrada.');
        setLoading(false);
        setShowingAttendance(false);
        return;
      }

      if (!classData.url) {
        setError('No se encontró URL para esta clase.');
        setLoading(false);
        setShowingAttendance(false);
        return;
      }

      // Redirect to the class URL
      window.location.href = classData.url;
    } catch (err) {
      console.error('Error redirecting to class:', err);
      setError('Error al redirigir a la clase. Por favor intenta de nuevo.');
      setLoading(false);
      setShowingAttendance(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Acceso a Clase
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Ingresa tu correo electrónico para acceder a la clase
        </p>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {showingAttendance && weeklyAttendanceCount !== null && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="text-sm font-medium">
              Has asistido a <strong>{weeklyAttendanceCount} clase{weeklyAttendanceCount !== 1 ? 's' : ''}</strong> esta semana.
              {maxClassesPerWeek !== null && maxClassesPerWeek !== undefined && maxClassesPerWeek > 0 && (
                <span> Tu límite es de {maxClassesPerWeek} clase{maxClassesPerWeek !== 1 ? 's' : ''} por semana.</span>
              )}
              {maxClassesPerWeek === 0 && (
                <span> Tu límite es de 0 clases por semana.</span>
              )}
              {(maxClassesPerWeek === null || maxClassesPerWeek === undefined) && (
                <span> Tienes acceso ilimitado.</span>
              )}
            </p>
            
            {attendedClassesThisWeek.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-300">
                <p className="text-xs font-semibold mb-2">Clases asistidas esta semana:</p>
                <div className="space-y-1">
                  {attendedClassesThisWeek.map((classItem, index) => {
                    const classDate = new Date(classItem.dateTime);
                    const formattedDate = classDate.toLocaleString('es-ES', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div key={classItem.classId || index} className="text-xs bg-green-50 p-2 rounded">
                        <div className="font-medium">{formattedDate}</div>
                        {classItem.level && (
                          <div className="text-green-600">Nivel: {classItem.level}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <p className="text-sm mt-2">Redirigiendo...</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="estudiante@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={loading || showingAttendance}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || showingAttendance}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition"
          >
            {checking ? (
              <span className="flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Verificando acceso...
              </span>
            ) : loading || showingAttendance ? (
              <span className="flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Redirigiendo...
              </span>
            ) : (
              'Acceder a Clase'
            )}
          </button>
        </form>

        {classId && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            ID de Clase: {classId}
          </p>
        )}
      </div>
    </div>
  );
}

