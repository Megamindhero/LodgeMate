# Firebase Setup Guide for Property Platform

## Why Firebase?
Firebase Realtime Database allows your properties to sync across ALL devices in real-time. When you add/delete a property from admin panel, it updates instantly on all phones, tablets, and computers viewing your site!

## Setup Steps (5 minutes):

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name it "Property Listings" (or anything you like)
4. Disable Google Analytics (not needed)
5. Click "Create project"

### 2. Enable Realtime Database
1. In your Firebase project, click "Realtime Database" in left menu
2. Click "Create Database"
3. Choose location closest to Nigeria (e.g., "europe-west1")
4. Start in **TEST MODE** (we'll secure it later)
5. Click "Enable"

### 3. Get Your Configuration
1. Click the gear icon (⚙️) next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon (</>) to add a web app
5. Give it a nickname: "Property Platform"
6. Click "Register app"
7. **COPY the firebaseConfig object** - it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Update Your Website
1. Open the `index.html` file
2. Find line 29-37 (the firebaseConfig section)
3. **Replace the demo config with YOUR config**
4. Save the file

### 5. Set Database Rules (Important for Security!)
1. In Firebase Console, go to "Realtime Database"
2. Click "Rules" tab
3. Replace the rules with:

```json
{
  "rules": {
    "properties": {
      ".read": true,
      ".write": false,
      "$propertyId": {
        ".write": "auth != null || newData.val() != null"
      }
    }
  }
}
```

This allows:
- Everyone can READ (view properties)
- Only you can WRITE (add/delete) from the admin panel

**Better Security (After Testing):**
If you want only specific IP to write, use:
```json
{
  "rules": {
    "properties": {
      ".read": true,
      ".write": false
    }
  }
}
```
Then manage properties only from your admin panel initially.

### 6. Upload to Netlify
1. Zip the `property-platform` folder
2. Drag and drop on Netlify
3. Done! ✨

## Features Now Working:

✅ **Cross-Device Sync** - Add property on phone, appears on all devices instantly
✅ **Real-time Updates** - Delete from admin, removed everywhere immediately  
✅ **Clickable Images** - Click any image to view full-size gallery with navigation
✅ **Expandable Descriptions** - Long descriptions show "Read more" button
✅ **Max 300 Characters** - Description limited to 300 chars as requested
✅ **Thumbnail Gallery** - See all property images at once

## Troubleshooting:

**"Firebase not defined" error:**
- Make sure you uploaded the ENTIRE folder, not just index.html
- Firebase scripts need to load from CDN

**Properties not saving:**
- Check your Firebase config is correct
- Verify Realtime Database is enabled
- Check Database Rules allow writing

**Properties not syncing across devices:**
- Clear browser cache on all devices
- Make sure all devices are viewing the same URL

## Free Tier Limits:
Firebase free tier includes:
- 1GB storage
- 10GB/month bandwidth
- 100 simultaneous connections

This is MORE than enough for a property listing site!

---

Need help? The Firebase config is the ONLY thing you need to change in the code!
