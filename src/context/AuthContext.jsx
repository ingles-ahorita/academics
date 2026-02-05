import { createContext, useContext, useState, useEffect } from 'react';

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
      // Call the API endpoint instead of direct Supabase call
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.success && result.teacher) {
        // Store teacher in state and localStorage
        setTeacher(result.teacher);
        localStorage.setItem('teacher', JSON.stringify(result.teacher));
        return { success: true, teacher: result.teacher };
      }

      throw new Error(result.error || 'Login failed');
    } catch (err) {
      console.error('Login error:', err);
      // Handle network errors specifically
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        return { 
          success: false, 
          error: 'Network error. Please check your internet connection and try again.' 
        };
      }
      return { success: false, error: err.message || 'Login failed' };
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







