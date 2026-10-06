# Jarvis app

The Android app for Jarvis. Log in with your WhatsApp number and a one-time code. No password.

- **Users:** your S-ID and your bot's status.
- **Owner:** a control room.

This repo holds only the app front-end (`www/`) and the build setup. The APK is built by GitHub Actions and attached to a release. There are no keys or server code here.

**Download:** https://github.com/nicholas-pp8/jarvis-app/releases/latest/download/jarvis.apk

Install: download the file, allow installs from your browser when Android asks, then open it. Check the download against `jarvis.apk.sha256` on the release page.

The app talks to the Jarvis portal over HTTPS. It never touches WhatsApp sessions, your chats, contacts or files. See ROADMAP.md for what is coming.
