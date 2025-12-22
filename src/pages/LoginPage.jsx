// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const teacher = localStorage.getItem('teacher');
    if (teacher) {
      try {
        const teacherData = JSON.parse(teacher);
        if (teacherData && teacherData.id) {
          navigate('/classes');
        }
      } catch (e) {
        localStorage.removeItem('teacher');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const emailLower = email.toLowerCase().trim();

    if (!emailLower) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const result = await login(emailLower);

    if (result.success) {
      navigate('/classes');
    } else {
      setError(result.error || 'Invalid email or email not found.');
    }

    setLoading(false);
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%',
        padding: '32px',
        backgroundColor: '#1b427d',
        borderRadius: '25px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <img 
          src={logo} 
          alt="Ingles Ahorita Logo" 
          style={{
            width: '400px',
            height: 'auto',
            display: 'block',
            margin: '0 auto 24px auto',
            backgroundColor: 'transparent'
          }}
        />

        <p style={{
          textAlign: 'center',
          color: '#ffffffff',
          marginBottom: '24px',
          fontSize: '15px'
        }}>
          Enter your email to continue
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginBottom: '16px',
              border: '1px solid #f9fafb',
              color: 'black',
              backgroundColor: 'white',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          
          <button 
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>
        
        {error && (
          <p style={{ 
            color: '#ef4444', 
            marginTop: '12px',
            fontSize: '14px',
            textAlign: 'center',
            padding: '8px',
            backgroundColor: '#fee2e2',
            borderRadius: '4px'
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

