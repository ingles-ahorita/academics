# Kajabi Webhook Setup Guide

This guide explains how to set up the Kajabi webhook to automatically add customers to the students table when they make a purchase.

## Prerequisites

1. A deployed version of this app (on Vercel or similar platform)
2. Access to your Kajabi account settings
3. Your Supabase credentials

## Setup Steps

### 1. Deploy Your App

Make sure your app is deployed to Vercel (or your hosting platform) so the webhook endpoint is accessible.

### 2. Get Your Webhook URL

Once deployed, your webhook URL will be:
```
https://your-domain.com/api/kajabi-webhook
```

For example:
- `https://academic.inglesahorita.com/api/kajabi-webhook`
- `https://your-app.vercel.app/api/kajabi-webhook`

### 3. Configure Environment Variables

In your Vercel project settings (or hosting platform), add these environment variables:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key (or use `SUPABASE_SERVICE_ROLE_KEY` for more permissions)

**Important:** For serverless functions, you may need to use `SUPABASE_SERVICE_ROLE_KEY` instead of the anon key to bypass RLS policies.

### 4. Set Up Kajabi Webhook

1. Log in to your Kajabi account
2. Go to **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook** or **Create Webhook**
4. Configure the webhook:
   - **Webhook URL**: Enter your webhook URL (from step 2)
   - **Event**: Select "Purchase Completed" or "Order Completed"
   - **Method**: POST
   - **Format**: JSON

### 5. Test the Webhook

After setting up, you can test it by:
1. Making a test purchase in Kajabi
2. Checking your Supabase `students` table for the new entry
3. Checking Vercel function logs for any errors

## Webhook Payload Structure

The webhook handler expects customer information in one of these formats:

**Format 1:**
```json
{
  "customer": {
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Format 2:**
```json
{
  "email": "student@example.com",
  "name": "John Doe"
}
```

**Format 3:**
```json
{
  "purchase": {
    "customer": {
      "email": "student@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

## Troubleshooting

### Student Not Created

1. Check Vercel function logs for errors
2. Verify environment variables are set correctly
3. Check that the webhook payload structure matches expected format
4. Ensure Supabase RLS policies allow inserts

### Webhook Not Receiving Requests

1. Verify the webhook URL is correct and accessible
2. Check Kajabi webhook settings
3. Test the endpoint manually with a POST request
4. Check Vercel function logs

### Duplicate Students

The webhook is idempotent - it checks if a student already exists by email or name before creating a new one. If duplicates are created, check:
1. Email normalization (case sensitivity)
2. Name matching logic
3. Database constraints

## Manual Testing

You can test the webhook manually using curl:

```bash
curl -X POST https://your-domain.com/api/kajabi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "Student"
    }
  }'
```

## Security Considerations

For production, consider adding:
1. Webhook signature verification (if Kajabi supports it)
2. IP whitelisting (Kajabi IP ranges)
3. Rate limiting
4. Authentication token in headers

