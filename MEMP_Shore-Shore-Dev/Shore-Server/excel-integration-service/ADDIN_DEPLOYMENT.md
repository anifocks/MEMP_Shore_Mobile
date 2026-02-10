# Excel Add-in Deployment Guide

## Overview
The Excel add-in now supports both **localhost (development)** and **production** environments with automatic manifest generation.

## Environment Configuration

### Development (.env)
```env
BASE_URL=https://localhost:7013
```

### Production (.env.production)
```env
BASE_URL=https://veemsonboardupgrade.theviswagroup.com
```

## Usage

### For Local Development
```bash
cd Shore-Server/excel-integration-service
npm run manifest:dev
npm run dev
```
This generates `manifest.xml` with localhost URLs.

### For Production Deployment
```bash
cd Shore-Server/excel-integration-service
npm run manifest:prod
npm start
```
This generates `manifest.xml` with production URLs.

## How It Works

1. **manifest.template.xml**: Template file with `{{BASE_URL}}` placeholders
2. **generate-manifest.js**: Script that replaces placeholders with environment-specific URLs
3. **manifest.xml**: Generated file (do not edit directly)

The script automatically runs before `npm start` via the `prestart` hook.

## Production Deployment Steps

1. **Deploy server to production**:
   - Copy code to production server
   - Ensure `.env.production` has correct BASE_URL
   - Run `npm run manifest:prod` to generate production manifest
   - Start server: `npm start`

2. **Users load add-in**:
   - Download the template from production URL
   - The template includes the production-configured add-in
   - Add-in automatically connects to production API

## Files Modified
- ✅ `.env` - Added BASE_URL for development
- ✅ `.env.production` - Created with production BASE_URL
- ✅ `manifest.template.xml` - Template with placeholders
- ✅ `generate-manifest.js` - Manifest generator script
- ✅ `package.json` - Added manifest generation scripts

## Testing

### Development
1. Run `npm run manifest:dev`
2. Check `public/office-addin/manifest.xml` has localhost URLs
3. Start server and test add-in

### Production
1. Run `npm run manifest:prod`
2. Check `public/office-addin/manifest.xml` has production URLs
3. Deploy and verify add-in works with production API
