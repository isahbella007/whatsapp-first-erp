/**
 * Test utility to simulate Twilio webhook requests
 * 
 * Run with: npx ts-node src/utils/test-webhook.ts
 */

import axios from 'axios';
import readline from 'readline';
import querystring from 'querystring';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Base URL
const BASE_URL = 'http://localhost:5000';

/**
 * Simulate a text message from a user
 * @param from Phone number
 * @param message Message text
 */
async function simulateTextMessage(from: string, message: string) {
  try {
    console.log(`\nSending text message from ${from}: "${message}"`);
    
    // Format properly like Twilio
    const formattedFrom = from.startsWith('+') ? `whatsapp:${from}` : `whatsapp:+${from}`;
    
    const data = {
      SmsMessageSid: `SM${Date.now()}`,
      From: formattedFrom,
      To: 'whatsapp:+14155238886',
      Body: message,
      NumMedia: '0',
      MessageSid: `SM${Date.now()}`,
    };
    
    // Twilio sends form data, not JSON
    const response = await axios.post(`${BASE_URL}/webhook/twilio`, 
      querystring.stringify(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error: any) {
    console.error('Error sending text message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Simulate a media message from a user
 * @param from Phone number
 * @param mediaUrl Media URL
 * @param mediaType Media type
 */
async function simulateMediaMessage(from: string, mediaUrl: string, mediaType: string) {
  try {
    console.log(`\nSending media message from ${from} (${mediaType})`);
    
    // Format properly like Twilio
    const formattedFrom = from.startsWith('+') ? `whatsapp:${from}` : `whatsapp:+${from}`;
    
    const data = {
      SmsMessageSid: `SM${Date.now()}`,
      From: formattedFrom,
      To: 'whatsapp:+14155238886',
      Body: '',
      NumMedia: '1',
      MediaContentType0: mediaType,
      MediaUrl0: mediaUrl,
      MessageSid: `SM${Date.now()}`,
    };
    
    // Twilio sends form data, not JSON
    const response = await axios.post(`${BASE_URL}/webhook/twilio`, 
      querystring.stringify(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error: any) {
    console.error('Error sending media message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Main menu function
 */
function showMenu() {
  console.log('\n=== Twilio Webhook Simulator ===');
  console.log('1. Send Text Message');
  console.log('2. Send Image Receipt');
  console.log('3. Exit');
  
  rl.question('\nSelect an option: ', (option) => {
    switch (option) {
      case '1':
        rl.question('Enter phone number: ', (phone) => {
          rl.question('Enter message: ', (message) => {
            simulateTextMessage(phone, message)
              .then(() => showMenu());
          });
        });
        break;
        
      case '2':
        rl.question('Enter phone number: ', (phone) => {
          rl.question('Enter image URL (use a valid one): ', (url) => {
            simulateMediaMessage(phone, url, 'image/jpeg')
              .then(() => showMenu());
          });
        });
        break;
        
      case '3':
        console.log('Goodbye!');
        rl.close();
        break;
        
      default:
        console.log('Invalid option, please try again.');
        showMenu();
        break;
    }
  });
}

// Start the application
showMenu(); 