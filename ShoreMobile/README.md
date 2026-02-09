# MEMP Shore Mobile

Marine Emissions Management Platform - Android Mobile Application

## Overview

This is the React Native mobile version of the MEMP Shore web application, providing maritime compliance and emissions management on mobile devices.

## Features

- User authentication
- Dashboard navigation
- Compliance reporting (EU MRV, EU ETS, UK MRV)
- Vessel management
- Voyage tracking
- Report generation

## Setup Instructions

### Prerequisites

1. Node.js (v16 or later)
2. Android Studio with Android SDK
3. Java Development Kit (JDK 11+)
4. React Native CLI

### Installation

1. Clone or navigate to the Shore-Mobile/ShoreMobile directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. For Android development, ensure Android SDK is properly configured

### Running the App

#### Android Emulator/Device

1. Start Android Studio and create/open an emulator
2. Run the app:
   ```bash
   npx react-native run-android
   ```

#### Development Server

For faster development with hot reloading:
```bash
npx react-native start
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── navigation/     # Navigation configuration
├── screens/        # Screen components
├── services/       # API services and configuration
└── utils/          # Utility functions
```

## API Configuration

The app connects to the same backend as the web version. Update `src/services/apiConfig.ts` for different environments:

- Development: `http://localhost:7000`
- Production: `https://veemsonboardupgrade.theviswagroup.com`

## Key Differences from Web Version

- **Navigation**: Uses React Navigation instead of React Router
- **UI Components**: Native components instead of web DOM elements
- **Styling**: StyleSheet objects instead of CSS
- **Storage**: AsyncStorage for local data persistence
- **Platform-specific**: Separate code for Android/iOS when needed

## Building for Production

### Android APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated in `android/app/build/outputs/apk/release/`

## Next Steps

This is a basic skeleton. To complete the mobile app:

1. Implement all screens from the web version
2. Add form components (pickers, date inputs)
3. Integrate maps (react-native-maps)
4. Add charts (react-native-chart-kit)
5. Implement offline data sync
6. Add push notifications
7. Optimize for performance

## Contributing

1. Follow React Native best practices
2. Use TypeScript for type safety
3. Test on both emulator and physical devices
4. Follow the existing code style

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
