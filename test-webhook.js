/**
 * Test script for Kajabi webhook
 * Run with: node test-webhook.js
 * 
 * This sends a test POST request to your webhook endpoint
 */

const testPayload = {
  customer: {
    email: "test@example.com",
    first_name: "Test",
    last_name: "Student",
    name: "Test Student"
  },
  purchase: {
    id: "test-purchase-123",
    amount: 99.99,
    currency: "USD"
  },
  event: "purchase.completed",
  timestamp: new Date().toISOString()
};

// Update this URL to match your deployed webhook endpoint
// For local testing: http://localhost:5174/api/kajabi-webhook
// For deployed: https://your-domain.com/api/kajabi-webhook
const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/kajabi-webhook';

async function testWebhook() {
  console.log('🧪 Testing webhook endpoint...\n');
  console.log('URL:', webhookUrl);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const responseData = await response.json();

    console.log('✅ Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('Check your webhook_inbounds table in Supabase to see the stored payload.');
    } else {
      console.log('\n❌ Webhook test failed');
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Your webhook is deployed and accessible');
    console.log('   2. The URL is correct');
    console.log('   3. Environment variables are set correctly');
    console.log('\nTo test locally, make sure your dev server is running.');
  }
}

testWebhook();





