# VibeCheck (Water Party) 🌊🎉

A highly vibrant, cross-platform party-matching application designed to let users swipe and discover nearby parties, host their own events, and chat in real-time. Built specifically to be compatible with **React Native / Expo** to run seamlessly on iOS, Android, and Web.

## 📱 Supported Platforms

- **iOS** (via React Native / Expo)
- **Android** (via React Native / Expo)
- **Web** (via React Native Web / Vite)

## 🚀 Features
- **Tinder-Style Swiping:** Interactive card swiping (`framer-motion` / Reanimated) to discover and request to join nearby parties.
- **Deep Profile Ecosystem:** Manage identity, real-time trust/ELO scores, dynamic lifestyle data, and customizable profile photo carousels.
- **Extensive Host Wizard:** Create a party utilizing geo-location, variable durations, automated locking based on capacities, and custom crowdfunding rotation pools.
- **Real-Time Live Chat:** Socket-powered real-time chatting separated into "Party Chats" and "Direct Messages".
- **Dynamic Theming:** Built with the "Vibrant Palette" (Deep blacks, Electric Purple, Neon Blues/Pinks).

---

## 🛠 Prerequisites

Make sure you have the following installed to run the app natively:
- **Node.js** (v18+ recommended)
- **React Native Environment Setup** (if running bare RN)
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (macOS only) or **Android Emulator**

---

## 💻 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd waterparty-app
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root and configure any frontend API hosts (if different from default `waterparty.onrender.com`).

---

## 🏃‍♂️ Running the app

### Run on iOS
```bash
npx expo run:ios
# OR
npm run ios
```

### Run on Android
```bash
npx expo run:android
# OR
npm run android
```

### Run on Web (Browser Preview)
```bash
npm run dev
# OR for Expo: npx expo start --web
```

---

## ⚙️ GitHub Actions CI / CD Pipeline

This repository includes a fully configured Continuous Integration (CI) pipeline located at `.github/workflows/ci.yml`.

### What it does automatically on `push` to `main`:
1. **Android:** Provisions the Java environment, generates the `android` native directory via Expo prebuild, and compiles a signed **Release APK**.
2. **iOS:** Provisions the macOS environment, installs CocoaPods, and compiles a **Simulator Build** (`.app`) inside Xcode to guarantee native code integrity without needing paid Apple Developer certificates up-front.
3. **Web:** Compiles the optimized production web assets.
4. **Artifacts:** Uploads all compiled binaries securely to your GitHub Actions run logs, so you can easily download the `.apk` and install it directly on your Android phone!

### 🔑 Note on iOS Physical Device Builds
To compile `.ipa` files for physical iOS devices, you will need to add your Apple Developer Certificates to GitHub Secrets or utilize **Expo Application Services (EAS)**:
```bash
eas build --platform ios
```

---

## 📁 Project Structure

```text
/
├── .github/workflows/  # CI/CD pipelines
├── src/
│   ├── components/     # Reusable UI components (BottomNav, etc.)
│   ├── pages/          # Full screen views (Swipe, Profile, Create, etc.)
│   ├── lib/            # Types, APIs, WebSockets, Store State
│   ├── index.css       # Tailwind/Global setup
│   └── App.tsx         # Main Routing configuration
├── package.json
└── README.md
```

## 🤝 Backend Architecture
This application natively connects to a Go/Next.js backend via WebSockets using `wss://waterparty.onrender.com/ws`. All data sent over the socket uses the `Event`, `Payload`, `Token` interface structure.
