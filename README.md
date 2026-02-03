# Academic Inglés Ahorita

A separate application for the academic.inglesahorita.com domain.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env` file in the root directory (copy from `.env.example`):
   ```env
   VITE_SUPABASE_URL=your_academic_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_academic_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

   **Google Service Account Setup:**
   - Go to Google Cloud Console → IAM & Admin → Service Accounts
   - Find your service account (or create one)
   - Create a new JSON key
   - Copy the entire JSON object and set it as `GOOGLE_SERVICE_ACCOUNT_KEY` (as a string)

   **Or configure them in Vercel:**
   - Go to your Vercel project → Settings → Environment Variables
   - Add all required variables including `GOOGLE_SERVICE_ACCOUNT_KEY`

3. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5174`

4. **Build for production**
   ```bash
   npm run build
   ```

## Deployment

This app is configured to deploy to Vercel. Make sure your environment variables are set in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for API routes)
- `GOOGLE_SERVICE_ACCOUNT_KEY` (full JSON as string, for Google Calendar API)

## Project Structure

```
academic-app/
├── src/
│   ├── pages/
│   │   └── LandingPage.jsx    # Main landing page
│   ├── lib/
│   │   └── supabaseClient.js  # Supabase configuration
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── package.json
└── vite.config.js
```

## Next Steps

1. Verify database connection on the landing page
2. Create your pages in `src/pages/`
3. Add routes in `src/App.jsx`
4. Start building! 🚀
















