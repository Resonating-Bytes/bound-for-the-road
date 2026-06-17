/**
 * One-time setup: register your ngrok authtoken for Expo tunnel mode.
 *
 * 1. Free account: https://dashboard.ngrok.com/signup
 * 2. Copy token: https://dashboard.ngrok.com/get-started/your-authtoken
 * 3. Run: set NGROK_AUTHTOKEN=your_token && npm run ngrok:authtoken
 *    (PowerShell: $env:NGROK_AUTHTOKEN="your_token"; npm run ngrok:authtoken)
 */
const { spawnSync } = require('child_process');
const path = require('path');

const token = process.env.NGROK_AUTHTOKEN;
if (!token) {
  console.error('Missing NGROK_AUTHTOKEN.');
  console.error('Get a free token: https://dashboard.ngrok.com/get-started/your-authtoken');
  console.error('Then: $env:NGROK_AUTHTOKEN="..."; npm run ngrok:authtoken');
  process.exit(1);
}

const bin = require('@expo/ngrok-bin');
const result = spawnSync(bin, ['authtoken', token], { stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
