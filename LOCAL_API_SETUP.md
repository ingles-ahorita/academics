# Local API Server Setup

This project includes a local development server to test API routes without deploying to Vercel.

## Running the Local API Server

```bash
npm run dev:api
```

The server will start on `http://localhost:3001` (or the port specified in `PORT` environment variable).

## Available Endpoints

- `POST /api/create-calendar-event` - Create Google Calendar event with Meet link
- `POST /api/create-student` - Create a new student
- `POST /api/kajabi-webhook` - Handle Kajabi webhook events

## Testing with curl

```bash
# Test create-calendar-event
curl -X POST http://localhost:3001/api/create-calendar-event \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Class",
    "description": "Test description",
    "startTime": "2024-01-01T10:00:00Z",
    "endTime": "2024-01-01T11:00:00Z",
    "teacherEmail": "info@inglesahorita.com"
  }'
```

## Environment Variables

Make sure you have the following environment variables set (create a `.env` file):

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Service Account (optional, can be inline in code)
GOOGLE_SERVICE_ACCOUNT_KEY=your_service_account_json
```

## Alternative: Using Vercel CLI

You can also use Vercel's CLI for local development:

```bash
npm install -g vercel
vercel dev
```

This will run your API routes in a Vercel-like environment.
