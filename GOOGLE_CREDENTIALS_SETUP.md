# Google Service Account Credentials Setup

## ⚠️ Important: Your old key was exposed and Google has disabled it

You need to generate a **new** service account key.

## Steps to Get a New Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select project: `live-class-creation`

2. **Navigate to Service Accounts**
   - Go to: IAM & Admin → Service Accounts
   - Find: `meet-automation@live-class-creation.iam.gserviceaccount.com`

3. **Create a New Key**
   - Click on the service account
   - Go to the "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Click "Create"
   - The JSON file will download automatically

4. **Set Up Environment Variable**

   **For Local Development:**
   - Open the downloaded JSON file
   - Copy the entire contents
   - In your `.env` file, add:
     ```env
     GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"live-class-creation",...}'
     ```
   - Make sure to wrap it in single quotes and escape any single quotes inside

   **For Vercel (Production):**
   - Go to your Vercel project → Settings → Environment Variables
   - Add new variable:
     - Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
     - Value: Paste the entire JSON content (as a string)
   - Make sure to select all environments (Production, Preview, Development)

5. **Delete the Old Key**
   - In Google Cloud Console, go back to the service account Keys tab
   - Delete the old key that was exposed (key ID: `08c8f81b2b425d640bf8e54e398c3639b81963dc`)

## Testing

After setting up the new key:

1. **Local testing:**
   ```bash
   npm run dev:api
   # Test the API endpoint
   ```

2. **Verify it works:**
   - Try creating a class from the frontend
   - Check that Google Calendar events are created successfully

## Security Notes

- ✅ Never commit the `.env` file (it's already in `.gitignore`)
- ✅ Never commit the service account JSON file
- ✅ Always use environment variables for secrets
- ✅ Rotate keys immediately if they're exposed
