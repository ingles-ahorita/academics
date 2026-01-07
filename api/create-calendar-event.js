import { google } from 'googleapis';
import crypto from 'crypto';

/**
 * 🔐 Service account credentials
 * (In production, load this from ENV, not inline)
 */
const serviceAccountKey = {
  type: "service_account",
  project_id: "live-class-creation",
  private_key_id: "d2d782a728d5de6611065eb175fec75da88a0e7b",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCxXUIbIj762+wf
ld+UQUecpses3lAQNQFicdP4pt1ywrKdU8dhawjzyK0H0oCkys+BruNNgt5MI+Vk
VWZvyTqvaDVaqQqFH8XKrtQ1C1l5kdeV6v8Y/7eysWb7rSjSOTnc0p9Ret/zvVPi
ibYBx4DM+WCyhgZXARx70mLnt7wVPV9SSxA27PTmczikPPg5HCgYTGyONMZpsbDc
Jq4VZiDtfe18pfE87gE7BVl0OFHBNJYd2BMB583wZDFDEStdhGXF6EYhbU5X46zA
edLTMPfYLQOwzKvcmMTPfBbCTP4VqPtp6oZ9LV6/K3CjMkiAfV5mPzD+E9r0M4LB
hnsVLp3LAgMBAAECggEAGsrnrYmi0epe5PaS66Zg1v0qtKZwmcIoD2L6jllGoote
x/1b5Q9yLsFlwgS+giZQ6los5Ayc4AucH2f3LXPMdarcRHG8sRd3nYKDc+/e+Epb
sr3pAzG94jSCRgqGXBtg7kay4nAZXIyBG3uKDwLAJjaVsOImGwaD8wB5CF/s/Zgi
06R08p2rj+evy6q+VVtptk9p1qEGZtk4noQOOXBLAGP+Cn8sHvMafRvCyA/PGn1y
mDBmudOTXiBWpapXXUBeRlJ8+PnG4CQ0bcGAobzbiIk9PNfJRGFk4GPfFSrQujky
QY4SZS+ZctLkY6I1cQI2jILjgK59VuUl0PDg5m8xgQKBgQDzzdJ4VqwF7yABA6xE
8pNkguIwYIMW21omf1EUrBsOn5wrjD3F2sfuVIck3csxcDHMag0uzANMn2IDQaYp
Yl9BYNCJgm3EW7U5IQ22P35oClmpiAte5hkWvGpD9eL8Kx117EtxCU4ggnPDMhqd
Z5qlXkfq6Dkef43jJdpQq8+t2wKBgQC6PJpML5+ffODTn3cZrES6b9bWWKYTECls
Kqa5b/ON/nhmBmg0iL/yap+4kwykwaL6ypL2JoZZWMYQeZVJJ4Z8c43GDCdddW4n
B9dPsXK1unahD7KO8x66wDMKG+fxB49whpyaSBFXNKQLmuqLDYRMdUJDaD12tIFM
tANqqX9q0QKBgBkpqQtahq6mG3t/UYxcLPI2v/mWPHFjek523Xtwt+oudwPXmZiO
GAx1FO2tJoeXuMwMNggabky+NnN3lxq2WHZ684r9ty6I+I9I5g1lSDqcttxUejf1
L6m1EJKrEh5MpOHC3ZZxC2s3i5Md3LlaNA/VRz7rcNnA+Hf1NC8XTHv5AoGBAJtI
7sr5ppoAMSKjQ1aHumLN4A+nqQoaHr/PLGdQfn72IIPJcdfj8lB6MSVgj1lND80X
XcSayMj06WlRR3XQ3CUm4J6zAZu+z5MBybjsV55JlKKlCRiChSvoGGakcBgcWrDT
vP4zeyoAfYwjps88/QQXfaHg5+bziSBgtLyaCeERAn8ho8RKOZdtmXcpoVIDp0c5
btC5PA94m2Iwit+g+FBicWfJfyJ31uc/ElKIjupQrRePTfNsaA8qsoxe4a9cDd7Z
O16kAkPAEcgXS7QmiwElpOp1lZk++5Lf7GYwiYeDXYYx/PN3ENY5jqIy6HGhgCY9
Kg6/lQcqDsPb2esRVmyN
-----END PRIVATE KEY-----`,
  client_email: "meet-automation@live-class-creation.iam.gserviceaccount.com",
  client_id: "117837142780562877528",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/meet-automation%40live-class-creation.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

/**
 * 👤 Workspace user that OWNS the calendar & Meet
 * MUST be a real Google Workspace user
 */
const IMPERSONATED_USER = 'info@inglesahorita.com';

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
    const { summary, description, startTime, endTime } = req.body;

    if (!summary || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: summary, startTime, endTime'
      });
    }

    // ─────────────────────────────────────────────
    // AUTH (THIS IS THE CRITICAL PART)
    // ─────────────────────────────────────────────
    const auth = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      subject: IMPERSONATED_USER // ✅ REQUIRED
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

    return res.status(500).json({
      success: false,
      error: 'Failed to create class meeting',
      details: error?.response?.data || error.message
    });
  }
}