# Exit Time Tracker

A minimal, elegant, mobile-first web app for tracking work hours and calculating exit time.

## Features
- **Entry Time Input**: Set your start time (defaults to current).
- **Break Management**: Add/edit/delete multiple breaks.
- **Exit Time Calculation**: Automatically adds 8 hours of work plus your total break time.
- **Live Updates**: See remaining work time and overtime in real-time.
- **Smart Logic**: Suggestions for typical breaks and warnings for unusually long breaks.
- **Persistence**: Your data is saved in `localStorage`.
- **PWA Ready**: Installable on your home screen and works offline.
- **Dark Mode**: Supports system preference or manual toggle.

## Tech Stack
- React
- Vite
- Tailwind CSS v4
- Lucide React
- Vite PWA Plugin

## How to Run Locally

1. **Prerequisites**: Ensure Node.js is installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
4. **Build for Production**:
   ```bash
   npm run build
   ```

## Deployment
You can deploy this as a static site to **Vercel**, **Netlify**, or **GitHub Pages**. Simply upload the contents of the `dist` folder.
