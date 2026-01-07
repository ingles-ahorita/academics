import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored teacher on mount
  useEffect(() => {
    const storedTeacher = localStorage.getItem('teacher');
    if (storedTeacher) {
      try {
        setTeacher(JSON.parse(storedTeacher));
      } catch (e) {
        localStorage.removeItem('teacher');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email) => {
    try {
      // Check if email exists in teachers table
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Email not found. Please check your email address.');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Email not found. Please check your email address.');
      }

      // Store teacher in state and localStorage
      setTeacher(data);
      localStorage.setItem('teacher', JSON.stringify(data));
      return { success: true, teacher: data };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setTeacher(null);
    localStorage.removeItem('teacher');
  };

  return (
    <AuthContext.Provider value={{ teacher, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}







