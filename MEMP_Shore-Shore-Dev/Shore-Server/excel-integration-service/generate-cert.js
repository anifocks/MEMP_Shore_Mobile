// generate-cert.js - Generate self-signed certificate for Office Add-in development

import selfsigned from 'selfsigned';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Generating self-signed certificate for localhost...');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const options = {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256'
};

const pems = selfsigned.generate(attrs, options);

// Write certificate and private key to files
fs.writeFileSync(path.join(__dirname, 'server-cert.pem'), pems.cert);
fs.writeFileSync(path.join(__dirname, 'server-key.pem'), pems.private);

console.log('✅ Certificate generated successfully!');
console.log('📄 Files created:');
console.log('   - server-cert.pem (Certificate)');
console.log('   - server-key.pem (Private Key)');
console.log('');
console.log('⚠️  IMPORTANT: You must trust this certificate in Windows:');
console.log('   1. Double-click server-cert.pem');
console.log('   2. Click "Install Certificate"');
console.log('   3. Select "Local Machine"');
console.log('   4. Choose "Trusted Root Certification Authorities"');
console.log('   5. Click Finish');
console.log('');
console.log('Or run in PowerShell as Administrator:');
console.log('   Import-Certificate -FilePath "server-cert.pem" -CertStoreLocation Cert:\\LocalMachine\\Root');
