import { google } from 'googleapis';

// Google Service Account credentials
const serviceAccountKey = {
  "type": "service_account",
  "project_id": "live-class-creation",
  "private_key_id": "d2d782a728d5de6611065eb175fec75da88a0e7b",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCxXUIbIj762+wf\nld+UQUecpses3lAQNQFicdP4pt1ywrKdU8dhawjzyK0H0oCkys+BruNNgt5MI+Vk\nVWZvyTqvaDVaqQqFH8XKrtQ1C1l5kdeV6v8Y/7eysWb7rSjSOTnc0p9Ret/zvVPi\nibYBx4DM+WCyhgZXARx70mLnt7wVPV9SSxA27PTmczikPPg5HCgYTGyONMZpsbDc\nJq4VZiDtfe18pfE87gE7BVl0OFHBNJYd2BMB583wZDFDEStdhGXF6EYhbU5X46zA\nedLTMPfYLQOwzKvcmMTPfBbCTP4VqPtp6oZ9LV6/K3CjMkiAfV5mPzD+E9r0M4LB\nhnsVLp3LAgMBAAECggEAGsrnrYmi0epe5PaS66Zg1v0qtKZwmcIoD2L6jllGoote\nx/1b5Q9yLsFlwgS+giZQ6los5Ayc4AucH2f3LXPMdarcRHG8sRd3nYKDc+/e+Epb\nsr3pAzG94jSCRgqGXBtg7kay4nAZXIyBG3uKDwLAJjaVsOImGwaD8wB5CF/s/Zgi\n06R08p2rj+evy6q+VVtptk9p1qEGZtk4noQOOXBLAGP+Cn8sHvMafRvCyA/PGn1y\nmDBmudOTXiBWpapXXUBeRlJ8+PnG4CQ0bcGAobzbiIk9PNfJRGFk4GPfFSrQujky\nQY4SZS+ZctLkY6I1cQI2jILjgK59VuUl0PDg5m8xgQKBgQDzzdJ4VqwF7yABA6xE\n8pNkguIwYIMW21omf1EUrBsOn5wrjD3F2sfuVIck3csxcDHMag0uzANMn2IDQaYp\nYl9BYNCJgm3EW7U5IQ22P35oClmpiAte5hkWvGpD9eL8Kx117EtxCU4ggnPDMhqd\nZ5qlXkfq6Dkef43jJdpQq8+t2wKBgQC6PJpML5+ffODTn3cZrES6b9bWWKYTECls\nKqa5b/ON/nhmBmg0iL/yap+4kwykwaL6ypL2JoZZWMYQeZVJJ4Z8c43GDCdddW4n\nB9dPsXK1unahD7KO8x66wDMKG+fxB49whpyaSBFXNKQLmuqLDYRMdUJDaD12tIFM\ntANqqX9q0QKBgBkpqQtahq6mG3t/UYxcLPI2v/mWPHFjek523Xtwt+oudwPXmZiO\nGAx1FO2tJoeXuMwMNggabky+NnN3lxq2WHZ684r9ty6I+I9I5g1lSDqcttxUejf1\nL6m1EJKrEh5MpOHC3ZZxC2s3i5Md3LlaNA/VRz7rcNnA+Hf1NC8XTHv5AoGBAJtI\n7sr5ppoAMSKjQ1aHumLN4A+nqQoaHr/PLGdQfn72IIPJcdfj8lB6MSVgj1lND80X\nXcSayMj06WlRR3XQ3CUm4J6zAZu+z5MBybjsV55JlKKlCRiChSvoGGakcBgcWrDT\nvP4zeyoAfYwjps88/QQXfaHg5+bziSBgtLyaCeERAn8ho8RKOZdtmXcpoVIDp0c5\nbtC5PA94m2Iwit+g+FBicWfJfyJ31uc/ElKIjupQrRePTfNsaA8qsoxe4a9cDd7Z\nO16kAkPAEcgXS7QmiwElpOp1lZk++5Lf7GYwiYeDXYYx/PN3ENY5jqIy6HGhgCY9\nKg6/lQcqDsPb2esRVmyN\n-----END PRIVATE KEY-----\n",
  "client_email": "meet-automation@live-class-creation.iam.gserviceaccount.com",
  "client_id": "117837142780562877528",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/meet-automation%40live-class-creation.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { summary, description, startTime, endTime, attendeeEmail } = req.body;

    // Validate required fields
    if (!summary || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: summary, startTime, and endTime are required' 
      });
    }

    // Authenticate with Google Calendar API using service account
    const auth = new google.auth.JWT(
      serviceAccountKey.client_email,
      null,
      serviceAccountKey.private_key,
      ['https://www.googleapis.com/auth/calendar'],
      null
    );

    const calendar = google.calendar({ version: 'v3', auth });

    // Create calendar event with Google Meet link
    const event = {
      summary: summary,
      description: description || '',
      start: {
        dateTime: startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime,
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
    });

    const createdEvent = response.data;
    const meetLink = createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri || null;

    return res.status(200).json({
      success: true,
      event: {
        id: createdEvent.id,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
        meetLink: meetLink,
        htmlLink: createdEvent.htmlLink,
      }
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return res.status(500).json({ 
      error: 'Failed to create calendar event',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

