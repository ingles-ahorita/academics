import { google } from 'googleapis';
import crypto from 'crypto';

/**
 * 🔐 Service account credentials
 * Load from environment variable GOOGLE_SERVICE_ACCOUNT_KEY (JSON string)
 * This should be set in Vercel environment variables or local .env file
 */
function getServiceAccountKey() {
  // Try to load from GOOGLE_SERVICE_ACCOUNT_KEY (JSON string) - preferred method
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      // Ensure private_key has proper newlines
      if (key.private_key) {
        key.private_key = key.private_key.replace(/\\n/g, '\n');
      }
      return key;
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error.message);
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
    }
  }

  throw new Error(
    'Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable. ' +
    'Set it in Vercel environment variables or local .env file. ' +
    'It should be the full service account JSON as a string.'
  );
}

const serviceAccountKey = getServiceAccountKey();

/**
 * 👤 Default Workspace user that OWNS the calendar & Meet
 * MUST be a real Google Workspace user
 * Can be overridden via teacherEmail in request body
 */
const DEFAULT_IMPERSONATED_USER = 'info@inglesahorita.com';

export default async function handler(req, res) { 
  // ─────────────────────────────────────────────
  // CORS
  // ─────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { summary, description, startTime, endTime, teacherEmail } = req.body;

    if (!summary || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: summary, startTime, endTime'
      });
    }

    // Use teacherEmail from request, or fall back to default
    const impersonatedUser = teacherEmail || DEFAULT_IMPERSONATED_USER;
    
    // Validate impersonated user email format
    if (!impersonatedUser || !impersonatedUser.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid teacher email',
        details: `Impersonated user must be a valid email address. Got: ${impersonatedUser}`
      });
    }

    // ─────────────────────────────────────────────
    // DEBUGGING: Inspect service account key before auth
    // ─────────────────────────────────────────────
    console.log('--- Debugging Service Account Key ---');
    console.log('GOOGLE_SERVICE_ACCOUNT_KEY env var set:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log('Service Account Email:', serviceAccountKey.client_email);
    console.log('Service Account Client ID:', serviceAccountKey.client_id);
    console.log('Private Key ID (from code):', serviceAccountKey.private_key_id);
    console.log('Impersonated User (subject):', impersonatedUser);
    if (serviceAccountKey.private_key) {
      console.log('Private Key Length:', serviceAccountKey.private_key.length);
      console.log('Private Key starts with:', serviceAccountKey.private_key.substring(0, 50));
      console.log('Private Key ends with:', serviceAccountKey.private_key.substring(serviceAccountKey.private_key.length - 50));
      // Basic format validation
      const hasBegin = serviceAccountKey.private_key.includes('-----BEGIN PRIVATE KEY-----');
      const hasEnd = serviceAccountKey.private_key.includes('-----END PRIVATE KEY-----');
      const hasNewlines = serviceAccountKey.private_key.includes('\n');
      console.log('Private Key has BEGIN marker:', hasBegin);
      console.log('Private Key has END marker:', hasEnd);
      console.log('Private Key has newlines:', hasNewlines);
      // Check for common issues
      const hasCarriageReturns = serviceAccountKey.private_key.includes('\r');
      const hasExtraSpaces = serviceAccountKey.private_key.match(/\s{2,}/);
      console.log('Private Key has carriage returns (\\r):', hasCarriageReturns);
      console.log('Private Key has extra spaces:', !!hasExtraSpaces);
      if (!hasBegin || !hasEnd) {
        console.error('CRITICAL: Private key format seems incorrect (missing BEGIN/END markers)');
      }
      // Check if key looks truncated or corrupted
      const expectedMinLength = 1500; // RSA private keys are typically 1600+ chars
      if (serviceAccountKey.private_key.length < expectedMinLength) {
        console.error(`CRITICAL: Private key seems too short (${serviceAccountKey.private_key.length} chars, expected ~${expectedMinLength}+)`);
      }
    } else {
      console.error('CRITICAL: Private Key is missing!');
    }
    console.log('-----------------------------------');

    // ─────────────────────────────────────────────
    // Use the original key as-is (it was working before)
    // ─────────────────────────────────────────────
    const privateKey = serviceAccountKey.private_key;

    // ─────────────────────────────────────────────
    // AUTH (THIS IS THE CRITICAL PART)
    // ─────────────────────────────────────────────
    const auth = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      subject: impersonatedUser // ✅ REQUIRED - uses logged in teacher's email
    });

    const calendar = google.calendar({
      version: 'v3',
      auth
    });

    // ─────────────────────────────────────────────
    // EVENT WITH GOOGLE MEET
    // ─────────────────────────────────────────────
    const event = {
      summary,
      description: description || '',
      start: {
        dateTime: startTime
      },
      end: {
        dateTime: endTime
      },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID()
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary', // ✅ ALWAYS primary
      conferenceDataVersion: 1,
      requestBody: event
    });

    const createdEvent = response.data;

    const meetLink =
      createdEvent.conferenceData?.entryPoints?.find(
        e => e.entryPointType === 'video'
      )?.uri || null;

    // ─────────────────────────────────────────────
    // SUCCESS RESPONSE
    // ─────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      event: {
        id: createdEvent.id,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
        meetLink,
        htmlLink: createdEvent.htmlLink,
        organizer: createdEvent.organizer?.email
      }
    });

  } catch (error) {
    console.error('Google Calendar error:', error?.response?.data || error);
    console.error('Error stack:', error.stack);
    
    const errorData = error?.response?.data || {};
    const isInvalidGrant = errorData.error === 'invalid_grant' || 
                          error.message?.includes('invalid_grant') ||
                          error.message?.includes('Invalid signature');

    if (isInvalidGrant) {
      // Check if this is specifically a signature error (key mismatch)
      const isSignatureError = errorData.error_description?.includes('Invalid signature') || 
                              error.message?.includes('Invalid signature');
      
      if (isSignatureError) {
        return res.status(500).json({
          success: false,
          error: 'Authentication failed: Invalid signature for token',
          diagnosis: 'The private key in your code does not match the key Google has on file for this service account.',
          mostLikelyCause: 'The service account key was regenerated, but the code still has the old key.',
          solution: [
            '🔑 Get a fresh service account key:',
            '1. Go to Google Cloud Console: https://console.cloud.google.com/',
            '2. Navigate to: IAM & Admin → Service Accounts',
            '3. Find: meet-automation@live-class-creation.iam.gserviceaccount.com',
            '4. Click on the service account → "Keys" tab',
            '5. Click "Add Key" → "Create new key" → Choose "JSON"',
            '6. Download the JSON file',
            '7. Open the JSON and copy the "private_key" value',
            '8. Update the private_key in api/create-calendar-event.js (around line 12)',
            '',
            '⚠️ Important: Make sure you\'re using the key from the correct service account!',
            '   Current key ID in code: d2d782a728d5de6611065eb175fec75da88a0e7b',
            '   Check if this key still exists in Google Cloud Console',
            '',
            'After updating, restart your local API server (npm run dev:api)'
          ].join('\n'),
          details: errorData.error_description || error.message,
          serviceAccountEmail: serviceAccountKey.client_email,
          currentKeyId: serviceAccountKey.private_key_id,
          impersonatedUser: req.body.teacherEmail || DEFAULT_IMPERSONATED_USER
        });
      }
      
      // Generic invalid_grant error (could be domain-wide delegation)
      return res.status(500).json({
        success: false,
        error: 'Authentication failed: invalid_grant',
        help: [
          'This error indicates the service account cannot impersonate the user.',
          '',
          'Possible causes:',
          '1. ❌ Domain-wide delegation is not enabled for the service account',
          '2. ❌ The service account key was regenerated but code still has old key',
          '3. ❌ OAuth scopes not configured in Google Workspace Admin Console',
          '',
          '🔧 How to fix:',
          '1. Go to Google Cloud Console → IAM & Admin → Service Accounts',
          '2. Find: meet-automation@live-class-creation.iam.gserviceaccount.com',
          '3. Click "Edit" → Enable "Domain-wide delegation"',
          '4. Copy the "Client ID": 117837142780562877528',
          '5. Go to Google Workspace Admin Console → Security → API Controls → Domain-wide Delegation',
          '6. Add new → Paste Client ID and add scope: https://www.googleapis.com/auth/calendar',
          '7. Save and wait a few minutes for changes to propagate',
          '',
          'OR if the key was regenerated:',
          '- Download the new service account JSON key',
          '- Update the private_key in the code with the new key'
        ].join('\n'),
        details: errorData.error_description || error.message,
        serviceAccountEmail: serviceAccountKey.client_email,
        clientId: serviceAccountKey.client_id,
        impersonatedUser: req.body.teacherEmail || DEFAULT_IMPERSONATED_USER
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create class meeting',
      details: errorData.error_description || error.message || error.toString(),
      errorCode: errorData.error,
      fullError: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}