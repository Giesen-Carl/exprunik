import fs from 'fs';
import crypto from 'crypto';

// Generate a 32-character hexadecimal string
const hexString = crypto.randomBytes(16).toString('hex');

// Prepare the content for the .env file
const envContent = `PASSWORD_HASH_SECRET=${hexString}\n`;

// Write the content to a new .env file
fs.writeFile('.env', envContent, (err) => {
  if (err) {
    console.error('Error writing to .env file:', err);
  } else {
    console.log('.env file created successfully with the hex string.');
  }
});
