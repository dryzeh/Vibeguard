# Node.js Version Management

This project uses [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions. To always use the correct version:

1. Install nvm if you haven't already:
   ```sh
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   ```
2. Run this in your project root before starting development or demos:
   ```sh
   nvm install # This will use the version in .nvmrc (Node 20)
   nvm use
   ```
3. (Optional) Add this to your shell profile to auto-switch Node when you cd into the project:
   ```sh
   cd() {
     builtin cd "$@"
     if [ -f .nvmrc ]; then
       nvm use
     fi
   }
   ```

---

# VibeGuard Security App

VibeGuard is a state-of-the-art nightclub safety monitoring system that ensures patron safety while maintaining privacy. This mobile application is designed for security personnel to respond to emergency situations efficiently.

## Features

- **Real-time Emergency Response**: Instant notification when patrons activate their emergency bracelets
- **Privacy-First Tracking**: Location tracking only activated during emergencies
- **Multi-Floor Management**: Easy navigation between different areas of the venue
- **Hybrid Connectivity**: Uses both BLE and Wi-Fi for reliable communication
- **High-Noise Environment Ready**: Distinct audio and vibration alerts designed for nightclub environments

## System Requirements

### iOS Devices
- iOS 13.0 or later
- Compatible with:
  - iPhone 6S or newer
  - iPad Pro (all models)
  - iPad Air 2 or newer
  - iPad mini 4 or newer

### Android Devices
- Android 6.0 (API level 23) or later
- Google Play Services installed
- Device must support:
  - Bluetooth 4.0 (BLE)
  - GPS/Location Services

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install development dependencies:
   ```bash
   npm install --save-dev
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on specific platform:
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

## Building for Production

### iOS
1. Configure your Apple Developer account in app.json
2. Build the iOS app:
   ```bash
   npm run build:ios
   ```

### Android
1. Configure your Android keystore
2. Build the Android app:
   ```bash
   npm run build:android
   ```

## Security Features

- End-to-end encryption for all communications
- GDPR-compliant data handling
- Automatic data cleanup after emergency resolution
- Role-based access control
- Audit logging for all emergency responses

## Support

For technical support or questions about the VibeGuard system, please contact:
- Email: support@vibeguard.com
- Phone: [Your Support Phone Number]

## License

Copyright © 2024 VibeGuard. All rights reserved.
