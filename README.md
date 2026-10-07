# CineNova — Next.js 16 + Firebase Movie Streaming Platform

A cinema-grade movie streaming web application built with **Next.js (App Router, Turbopack)**, **Firebase Cloud Firestore**, **TypeScript**, and **Vanilla CSS Design System**.

featuring rich dark mode aesthetics, dynamic ambient glows, an interactive hero carousel, high-definition trailer playback with Cinema Mode, instant search, a persistent Watchlist, and a full-featured Admin Portal with secret keyboard access.

---

## ✨ Features & Upgrades

- **Deep Obsidian & Neon Crimson Design System**:
  - Atmospheric radial glow spotlights that dynamically accent movie banners.
  - Glassmorphic navigation bar with scroll detection and blur effects.
  - 3D hover scale and glowing rim reflections on movie cards.
- **Hero Showcase Carousel**:
  - Rotating showcase of featured premieres.
  - One-click trailer modal trigger, movie details link, and watchlist bookmark.
- **Interactive Video Player Modal with Cinema Mode**:
  - Fullscreen video modal supporting YouTube embeds, Vimeo, and direct MP4 cloud streams.
  - Cinema Mode toggle that dims ambient lighting for an authentic theatrical experience.
- **Dynamic Catalog Discovery & Filters**:
  - Multi-genre filtering pills (*Action, Horror, Sci-Fi, Drama, Thriller, etc.*).
  - Status segmented controls: *All Catalog*, *Full Movies (Streamable)*, *Upcoming Releases*.
  - Sort by *Featured*, *Top Rating*, *Newest Release*, or *Title (A-Z)*.
  - Real-time search with instant results and keyboard shortcut (`Ctrl+K`).
- **Persistent Watchlist**:
  - LocalStorage-backed bookmarking drawer accessible anywhere across the platform.
- **Movie Detail Pages (`/movie/[id]`)**:
  - Cinematic high-res backdrop banner with gradient blending.
  - Release countdown badge, IMDb star rating, duration, and full storyline synopsis.
  - Top cast & crew section with actor portraits and character names.
  - "More Like This" intelligent recommendation row matching movie genres.
- **Secret Admin Trigger & Modern Management Dashboard (`/admin`)**:
  - Type the secret key code `cinenova` (or `admincine`) anywhere on your keyboard to instantly trigger the admin transition toast.
  - Secure credential authentication (`admin` / `admin123`).
  - Add, edit, and delete movies with cast repeater fields and image previews.
  - Firebase Firestore database health status indicator and one-click "Clean Database" wipe action.

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Database**: [Firebase Cloud Firestore](https://firebase.google.com/) via `firebase`
- **Styling**: Vanilla CSS tokens & utilities (`src/app/globals.css`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: TypeScript

---

## 🚀 Getting Started

### 1. Configure Firebase Credentials

In `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# CineNova Admin Secret Access Code (Type 'cinenova' or 'admincine' on keyboard anywhere)
ADMIN_SECRET_CODE=cinenova

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> **Resilient Database Layer**: If Firebase credentials are not yet entered, the app gracefully operates in an in-memory resilient state and displays the status pill in the footer and admin dashboard. Once `.env.local` has your Firebase keys, it will instantly synchronize with Firestore!

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production

```bash
npm run build
npm run start
```

---

## 🔐 Admin Access

- **Direct URL**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Secret Keyboard Trigger**: Simply type `cinenova` on your keyboard while on any page.
- **Default Username**: `admin`
- **Default Password**: `admin123`
