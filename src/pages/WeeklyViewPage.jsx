import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekBounds(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 0, Sunday = 6 (adjust so week starts Monday)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function formatWeekLabel(start, end) {
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function WeeklyViewPage() {
  const { teacher, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current, -1 = prev, +1 = next
  const [classes, setClasses] = useState([]);
  const [attendanceByClass, setAttendanceByClass] = useState({});
  const [teacherNames, setTeacherNames] = useState({});

  const { start, end } = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekBounds(d);
  }, [weekOffset]);

  useEffect(() => {
    if (!teacher) {
      navigate('/');
      return;
    }
    fetchWeekData();
  }, [teacher, weekOffset]);

  const fetchWeekData = async () => {
    if (!teacher) return;

    try {
      setLoading(true);
      setError(null);

      const isManager = teacher.role === 'Manager';
      const tableNames = ['classes', 'class', 'sessions', 'lessons', 'academic_classes'];

      let allClasses = [];
      for (const tableName of tableNames) {
        let query = supabase.from(tableName).select('*');
        if (!isManager) {
          query = query.eq('teacher_id', teacher.id);
        }
        const { data, error: tableError } = await query;

        if (!tableError && data?.length > 0) {
          allClasses = data;
          break;
        }
        if (tableError && tableError.code !== 'PGRST116') break;
      }

      const classIds = new Set(allClasses.map((c) => c.id));

      // Filter classes to selected week
      const weekClasses = allClasses.filter((c) => {
        if (!c.date_time) return false;
        const d = new Date(c.date_time);
        return d >= start && d <= end;
      });

      // Fetch attendance for these classes
      const classIdList = weekClasses.map((c) => c.id);
      let attendance = [];

      if (classIdList.length > 0) {
        const { data: attData, error: attError } = await supabase
          .from('attendance')
          .select('class_id')
          .in('class_id', classIdList);

        if (!attError) attendance = attData || [];
      }

      const countByClass = {};
      attendance.forEach((a) => {
        if (classIds.has(a.class_id)) {
          countByClass[a.class_id] = (countByClass[a.class_id] || 0) + 1;
        }
      });

      setAttendanceByClass(countByClass);
      setClasses(weekClasses);

      // Fetch teacher names if Manager
      if (isManager && weekClasses.length > 0) {
        const teacherIds = [...new Set(weekClasses.map((c) => c.teacher_id).filter(Boolean))];
        if (teacherIds.length > 0) {
          const { data: teachers } = await supabase
            .from('teachers')
            .select('id, name, email')
            .in('id', teacherIds);
          const map = {};
          (teachers || []).forEach((t) => {
            map[t.id] = t.name || t.email;
          });
          setTeacherNames(map);
        }
      }
    } catch (err) {
      console.error('Error fetching week data:', err);
      setError(err.message || 'Failed to load week data');
    } finally {
      setLoading(false);
    }
  };

  const classesByDay = useMemo(() => {
    const byDay = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
    classes.forEach((c) => {
      const d = new Date(c.date_time);
      const dayIdx = d.getDay();
      const key = dayIdx === 0 ? 'Sun' : DAYS[dayIdx - 1];
      byDay[key].push({ ...c, attendanceCount: attendanceByClass[c.id] || 0 });
    });
    DAYS.forEach((day) => {
      byDay[day].sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    });
    return byDay;
  }, [classes, attendanceByClass]);

  const chartData = useMemo(() => {
    return [...classes]
      .sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
      .map((c) => {
        const d = new Date(c.date_time);
        const label = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return {
          name: label.length > 18 ? label.slice(0, 18) + '…' : label,
          fullName: label,
          attendance: attendanceByClass[c.id] || 0,
          level: c.level || '—',
        };
      });
  }, [classes, attendanceByClass]);

  const dailyTotals = useMemo(() => {
    const totals = DAYS.map((day) => ({
      day,
      classes: classesByDay[day].length,
      attendance: classesByDay[day].reduce((s, c) => s + (c.attendanceCount || 0), 0),
    }));
    return totals;
  }, [classesByDay]);

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    return new Date(dateTimeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTakeAttendance = (classId) => {
    window.open(`/manage-class/${classId}/attendance`, '_blank');
  };

  if (!teacher) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Weekly View</h1>
            <p className="text-slate-600 mt-1">
              {teacher.role === 'Manager' ? 'All classes' : 'Your classes'} – at a glance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                <button
                  onClick={() => setWeekOffset((o) => o - 1)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  ← Prev
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-slate-700 min-w-[200px] text-center">
                  {formatWeekLabel(start, end)}
                </span>
                <button
                  onClick={() => setWeekOffset((o) => o + 1)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Next →
                </button>
              </div>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200"
                >
                  This week
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/insights')}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Insights
              </button>
              <button
                onClick={() => navigate('/classes')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Classes
              </button>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <p className="mt-4 text-slate-600">Loading week...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Classes this week</p>
                <p className="text-2xl font-bold text-slate-800">{classes.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Total attendance</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {Object.values(attendanceByClass).reduce((a, b) => a + b, 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Avg per class</p>
                <p className="text-2xl font-bold text-slate-800">
                  {classes.length > 0
                    ? (
                        Object.values(attendanceByClass).reduce((a, b) => a + b, 0) /
                        classes.length
                      ).toFixed(1)
                    : '—'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                <p className="text-sm font-medium text-slate-500">Days with classes</p>
                <p className="text-2xl font-bold text-slate-800">
                  {DAYS.filter((d) => classesByDay[d].length > 0).length}
                </p>
              </div>
            </div>

            {/* Bar chart: attendance per class */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 md:p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Attendance per class
                </h2>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.[0]) {
                            const p = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
                                <p className="font-medium text-slate-800">{p.fullName}</p>
                                <p className="text-slate-500">{p.level}</p>
                                <p className="text-indigo-600 font-semibold">
                                  {p.attendance} attended
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="attendance" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.attendance > 0 ? '#6366f1' : '#cbd5e1'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Daily totals bar chart */}
            {dailyTotals.some((d) => d.classes > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 md:p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Daily overview
                </h2>
                <div className="h-48 md:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyTotals}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.[0]) {
                            const p = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
                                <p className="font-medium text-slate-800">{p.day}</p>
                                <p className="text-slate-600">{p.classes} classes</p>
                                <p className="text-indigo-600 font-semibold">
                                  {p.attendance} total attendance
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="attendance" fill="#6366f1" radius={[4, 4, 0, 0]} name="Attendance" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Week grid: classes by day */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <h2 className="text-lg font-semibold text-slate-800 px-5 py-4 border-b border-slate-100">
                Classes by day
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 p-4">
                {DAYS.map((day) => (
                  <div key={day} className="min-h-[120px]">
                    <div className="text-sm font-semibold text-slate-600 mb-2 pb-2 border-b border-slate-100">
                      {day}
                    </div>
                    <div className="space-y-2">
                      {classesByDay[day].length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No classes</p>
                      ) : (
                        classesByDay[day].map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleTakeAttendance(c.id)}
                            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition cursor-pointer group"
                          >
                            <p className="text-sm font-medium text-slate-800 group-hover:text-indigo-700">
                              {formatTime(c.date_time)}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{c.level || '—'}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded text-xs font-semibold ${
                                  (c.attendanceCount || 0) > 0
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {c.attendanceCount || 0} ✓
                              </span>
                              {teacher.role === 'Manager' && c.teacher_id && (
                                <span className="text-xs text-slate-400 truncate flex-1 text-right">
                                  {teacherNames[c.teacher_id] || ''}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
