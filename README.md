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

### GitHub Pages

This app is configured to deploy to GitHub Pages automatically using GitHub Actions.

**Setup Instructions:**

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Add GitHub Secrets:**
   - Go to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `VITE_SUPABASE_URL` - Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

3. **Push to main branch:**
   - The workflow will automatically build and deploy on every push to `main` or `master`
   - Your app will be available at `https://[username].github.io/academic-app/`

4. **Custom Domain (Optional):**
   - If you're using a custom domain (like `academic.inglesahorita.com`), update the `base` path in `vite.config.js` to `/` instead of `/academic-app/`
   - Configure your custom domain in GitHub Pages settings

**Note:** The deployment workflow will run automatically on every push to the main branch. You can also trigger it manually from the Actions tab.

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


