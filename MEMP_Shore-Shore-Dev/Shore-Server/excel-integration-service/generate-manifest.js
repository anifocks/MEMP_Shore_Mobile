import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variable or default to 'development'
const env = process.env.NODE_ENV || 'development';

// Define base URLs for each environment
const envConfig = {
    development: 'https://localhost:7013',
    production: 'https://veemsonboardupgrade.theviswagroup.com'
};

const baseUrl = envConfig[env] || envConfig.development;

console.log(`\n🔧 Generating manifest for ${env.toUpperCase()} environment...`);
console.log(`📍 Base URL: ${baseUrl}\n`);

// Read the template manifest
const templatePath = path.join(__dirname, 'public', 'office-addin', 'manifest.template.xml');
const outputPath = path.join(__dirname, 'public', 'office-addin', 'manifest.xml');

let manifestContent = fs.readFileSync(templatePath, 'utf8');

// Replace all placeholder URLs with environment-specific URLs
manifestContent = manifestContent.replace(/\{\{BASE_URL\}\}/g, baseUrl);

// Write the generated manifest
fs.writeFileSync(outputPath, manifestContent, 'utf8');

console.log(`✅ Manifest generated successfully at: ${outputPath}\n`);
