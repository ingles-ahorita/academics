import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function InsightsPage() {
  const { teacher, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (teacher) {
      fetchInsights();
    }
  }, [teacher]);

  useEffect(() => {
    if (!teacher) {
      navigate('/');
    }
  }, [teacher, navigate]);

  const fetchInsights = async () => {
    if (!teacher) return;

    try {
      setLoading(true);
      setError(null);

      const isManager = teacher.role === 'Manager';
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];

      // Fetch classes
      let classes = [];
      for (const tableName of tableNames) {
        let query = supabase.from(tableName).select('*');
        if (!isManager) {
          query = query.eq('teacher_id', teacher.id);
        }
        const { data, error: tableError } = await query;

        if (!tableError && data?.length > 0) {
          classes = data;
          break;
        }
        if (tableError && tableError.code !== 'PGRST116') break;
      }

      // Fetch all attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('class_id, student_id, created_at');

      if (attendanceError) throw attendanceError;
      const attendance = attendanceData || [];

      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, email, weekly_classes');

      if (studentsError) throw studentsError;
      const students = studentsData || [];

      // Build class lookup (only classes we have access to)
      const classIds = new Set(classes.map((c) => c.id));
      const classMap = {};
      classes.forEach((c) => {
        classMap[c.id] = c;
      });

      // Filter attendance to only our classes
      const relevantAttendance = attendance.filter((a) => classIds.has(a.class_id));

      // --- Compute metrics ---

      // 1. Most popular classes (by attendance count)
      const classAttendanceCount = {};
      relevantAttendance.forEach((a) => {
        classAttendanceCount[a.class_id] = (classAttendanceCount[a.class_id] || 0) + 1;
      });

      const popularClasses = classes
        .map((c) => ({
          ...c,
          attendanceCount: classAttendanceCount[c.id] || 0,
        }))
        .filter((c) => c.date_time) // Only classes with a date
        .sort((a, b) => b.attendanceCount - a.attendanceCount)
        .slice(0, 10);

      // 2. Most popular times (by hour of day)
      const hourCounts = {};
      for (let h = 0; h < 24; h++) hourCounts[h] = 0;

      classes.forEach((c) => {
        if (c.date_time) {
          const hour = new Date(c.date_time).getHours();
          hourCounts[hour]++;
        }
      });

      const popularTimes = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
        .filter((t) => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const formatHour = (h) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const display = h % 12 || 12;
        return `${display}:00 ${ampm}`;
      };

      // 3. Top students by attendance (weekly/total)
      const studentAttendanceCount = {};
      relevantAttendance.forEach((a) => {
        studentAttendanceCount[a.student_id] =
          (studentAttendanceCount[a.student_id] || 0) + 1;
      });

      const topStudents = students
        .map((s) => ({
          ...s,
          attendanceCount: studentAttendanceCount[s.id] || 0,
          weeklyClasses: s.weekly_classes,
        }))
        .filter((s) => s.attendanceCount > 0)
        .sort((a, b) => b.attendanceCount - a.attendanceCount)
        .slice(0, 15);

      // 4. Most popular levels
      const levelCounts = {};
      classes.forEach((c) => {
        const level = c.level || 'Unspecified';
        levelCounts[level] = (levelCounts[level] || 0) + 1;
      });

      const popularLevels = Object.entries(levelCounts)
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // 5. Summary stats
      const totalClasses = classes.length;
      const pastClasses = classes.filter((c) => c.date_time && new Date(c.date_time) < new Date());
      const futureClasses = classes.filter((c) => c.date_time && new Date(c.date_time) >= new Date());
      const totalAttendance = relevantAttendance.length;
      const uniqueStudents = new Set(relevantAttendance.map((a) => a.student_id)).size;
      const avgAttendancePerClass =
        pastClasses.length > 0
          ? (relevantAttendance.filter((a) => {
              const cls = classMap[a.class_id];
              return cls?.date_time && new Date(cls.date_time) < new Date();
            }).length /
              pastClasses.length).toFixed(1)
          : 0;

      setInsights({
        totalClasses,
        pastClasses: pastClasses.length,
        futureClasses: futureClasses.length,
        totalAttendance,
        uniqueStudents,
        avgAttendancePerClass,
        popularClasses,
        popularTimes,
        formatHour,
        topStudents,
        popularLevels,
      });
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    return new Date(dateTimeString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!teacher) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Class Insights</h1>
            <p className="text-slate-600 mt-1">
              Analytics for {teacher.role === 'Manager' ? 'all classes' : 'your classes'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/weekly')}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-medium"
            >
              Weekly View
            </button>
            <button
              onClick={() => navigate('/classes')}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
            >
              Classes
            </button>
            <button
              onClick={() => navigate('/students')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
            >
              Students
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <p className="mt-4 text-slate-600">Loading insights...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && !error && insights && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Total Classes</p>
                <p className="text-2xl font-bold text-slate-800">{insights.totalClasses}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Past Classes</p>
                <p className="text-2xl font-bold text-slate-800">{insights.pastClasses}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Upcoming</p>
                <p className="text-2xl font-bold text-indigo-600">{insights.futureClasses}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Total Attendance</p>
                <p className="text-2xl font-bold text-slate-800">{insights.totalAttendance}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Unique Students</p>
                <p className="text-2xl font-bold text-slate-800">{insights.uniqueStudents}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Avg / Past Class</p>
                <p className="text-2xl font-bold text-slate-800">
                  {insights.avgAttendancePerClass}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Most Popular Classes */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Most Popular Classes (by attendance)
                  </h2>
                </div>
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {insights.popularClasses.length === 0 ? (
                    <div className="p-6 text-slate-500 text-center">No data yet</div>
                  ) : (
                    insights.popularClasses.map((c) => (
                      <div
                        key={c.id}
                        className="px-5 py-3 flex justify-between items-center hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-medium text-slate-800">
                            {formatDateTime(c.date_time)}
                          </p>
                          <p className="text-sm text-slate-500">{c.level || '—'}</p>
                        </div>
                        <span className="font-semibold text-indigo-600">
                          {c.attendanceCount} attended
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Most Popular Times */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Most Popular Class Times
                  </h2>
                </div>
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {insights.popularTimes.length === 0 ? (
                    <div className="p-6 text-slate-500 text-center">No data yet</div>
                  ) : (
                    insights.popularTimes.map((t) => (
                      <div
                        key={t.hour}
                        className="px-5 py-3 flex justify-between items-center hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-800">
                          {insights.formatHour(t.hour)}
                        </span>
                        <span className="text-slate-600">{t.count} classes</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Top Students & Popular Levels */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Students by Attendance */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Top Students by Attendance
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Students with most class attendances
                  </p>
                </div>
                <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                  {insights.topStudents.length === 0 ? (
                    <div className="p-6 text-slate-500 text-center">No attendance data yet</div>
                  ) : (
                    insights.topStudents.map((s, i) => (
                      <div
                        key={s.id}
                        className="px-5 py-3 flex justify-between items-center hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-slate-800">
                              {s.name || s.email || 'Unknown'}
                            </p>
                            {s.name && (
                              <p className="text-xs text-slate-500">{s.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-indigo-600">
                            {s.attendanceCount} classes
                          </span>
                          {s.weeklyClasses != null && (
                            <p className="text-xs text-slate-500">
                              {s.weekly_classes}/wk allocated
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Most Popular Levels */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-800">
                    Most Popular Levels
                  </h2>
                </div>
                <div className="p-5">
                  {insights.popularLevels.length === 0 ? (
                    <div className="text-slate-500 text-center py-6">No data yet</div>
                  ) : (
                    <div className="space-y-3">
                      {insights.popularLevels.map(({ level, count }) => {
                        const maxCount = Math.max(...insights.popularLevels.map((l) => l.count));
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={level}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-slate-700">{level}</span>
                              <span className="text-slate-500">{count} classes</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
