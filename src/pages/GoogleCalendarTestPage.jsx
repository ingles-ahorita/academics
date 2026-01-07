import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GoogleCalendarTestPage() {
  const { teacher } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    summary: 'Test Class',
    description: 'This is a test class created via Google Calendar API',
    startTime: '',
    endTime: '',
    attendeeEmail: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      // Convert local datetime to ISO string
      const startDateTime = new Date(formData.startTime).toISOString();
      const endDateTime = new Date(formData.endTime).toISOString();

      // Use environment variable for API URL, or default based on environment
      // In development, call Vercel dev directly on port 3000
      // In production, use relative path which will be handled by Vercel
      const isDevelopment = import.meta.env.DEV;
      const apiUrl = import.meta.env.VITE_API_URL || 
        (isDevelopment ? 'http://localhost:3000/api/create-calendar-event' : '/api/create-calendar-event');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: formData.summary,
          description: formData.description,
          startTime: startDateTime,
          endTime: endDateTime,
          attendeeEmail: formData.attendeeEmail || null
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          errorDetails = errorData.details || errorData.code || null;
          console.error('API Error Response:', errorData);
        } catch (e) {
          // If response isn't JSON, use status text
          const text = await response.text();
          errorMessage = text || errorMessage;
          console.error('API Error (non-JSON):', text);
        }
        const fullErrorMessage = errorDetails 
          ? `${errorMessage}\n\nDetails: ${errorDetails}` 
          : errorMessage;
        throw new Error(fullErrorMessage);
      }

      const data = await response.json();
      setSuccess(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'An error occurred while creating the calendar event');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Google Calendar API Test
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
              <p className="font-semibold">Error:</p>
              <p className="text-sm">{error}</p>
              {error.includes('404') && (
                <div className="mt-3 pt-3 border-t border-red-300">
                  <p className="text-xs font-semibold mb-1">💡 Development Tip:</p>
                  <p className="text-xs">
                    API routes only work when deployed to Vercel or when using <code className="bg-red-200 px-1 rounded">vercel dev</code> for local development.
                    <br />
                    To test locally, run: <code className="bg-red-200 px-1 rounded">npx vercel dev</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p className="font-semibold mb-2">✅ {success.message || 'Event Created Successfully!'}</p>
              <div className="text-sm space-y-1">
                <p><strong>Event ID:</strong> {success.event.id}</p>
                <p><strong>Summary:</strong> {success.event.summary}</p>
                <p><strong>Start:</strong> {formatDateTime(success.event.start?.dateTime)}</p>
                <p><strong>End:</strong> {formatDateTime(success.event.end?.dateTime)}</p>
                {success.event.calendarId && (
                  <p><strong>Calendar ID:</strong> {success.event.calendarId}</p>
                )}
                {success.event.meetLink ? (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="font-semibold mb-2">🔗 Google Meet Link:</p>
                    <div className="bg-white p-3 rounded border border-green-300 mb-2">
                      <a 
                        href={success.event.meetLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all font-medium"
                      >
                        {success.event.meetLink}
                      </a>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(success.event.meetLink);
                        alert('Meet link copied to clipboard!');
                      }}
                      className="text-xs bg-green-200 hover:bg-green-300 px-2 py-1 rounded"
                    >
                      Copy Link
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="text-xs text-yellow-700">
                      ⚠️ Meet link was not generated. You may need to add it manually in Google Calendar.
                    </p>
                  </div>
                )}
                {success.event.htmlLink && (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <a 
                      href={success.event.htmlLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      📅 View in Google Calendar →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Summary *
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Class Title"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                rows="3"
                placeholder="Class description"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendee Email (Optional)
              </label>
              <input
                type="email"
                value={formData.attendeeEmail}
                onChange={(e) => setFormData({ ...formData, attendeeEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="student@example.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Event...
                </span>
              ) : (
                'Create Calendar Event'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

