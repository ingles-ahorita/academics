# Academic Inglés Ahorita

A separate application for the academic.inglesahorita.com domain.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_academic_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_academic_supabase_anon_key
   ```

   Or configure them in Vercel:
   - Go to your Vercel project → Settings → Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

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






