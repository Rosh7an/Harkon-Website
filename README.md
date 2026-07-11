# Exter Cloud — Landing Page

Marketing website for Exter Cloud. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS v3, TypeScript
- **Font**: Bricolage Grotesque (via `next/font/google`)

## Features

- Canvas-based particle system in the hero section
- Typewriter effect cycling service keywords
- 3D fan carousel for the process section
- Scroll-driven animated stats counters
- Scroll-spy side navigation dots
- Orbit ring CTA animation
- Dark/light theme toggle (dark by default, preference saved to `localStorage`)
- Branded splash screen on initial load
- Query modal with country-code phone validation

## Project Structure

```
app/
  page.tsx          # Home (full SPA with hash-scroll nav)
  layout.tsx
  globals.css
  icon.png          # Favicon / app icon
  opengraph-image.png # Social share preview image
  services/         # Services sub-page
  process/          # Process sub-page
  why/              # Why Exter Cloud sub-page
  contact/          # Contact sub-page

components/
  Nav.tsx           # Fixed top navigation
  ThemeToggle.tsx   # Dark/light theme toggle button
  SplashScreen.tsx  # Branded splash screen on initial load
  SideNav.tsx       # Fixed right-side section dots
  Hero.tsx          # Particle canvas + typewriter heading
  Marquee.tsx       # Scrolling ticker
  Services.tsx      # Sliding panel with service list
  Process.tsx       # 3D card carousel + tab bar + detail panel
  Stats.tsx         # Animated counters + progress bars
  CTA.tsx           # Orbit ring call-to-action + query modal trigger
  QueryModal.tsx     # Glassmorphism contact form with validation
  CountrySelect.tsx # Country-code dropdown with search
  countryCodes.ts   # Country dial codes + phone length rules
  Footer.tsx
  About.tsx
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Design System

Theme is controlled by `data-theme` on `<html>` (`ThemeToggle.tsx`). Dark is the default (no attribute); `data-theme="light"` opts into the light palette. Preference persists in `localStorage`.

| Token | Dark (default) | Light | Use |
|---|---|---|---|
| `--bg` | `#070E15` | `#FAF9F6` | Page background |
| `--surface` | `#0B141D` | `#F0ECE4` | Card/section background |
| `--panel` | `#142433` | `#FFFFFF` | Panel background |
| `--accent` | `#D85A30` | `#D85A30` | Primary coral accent |
| `--accent2` | `#F0997B` | `#0C2A43` | Secondary accent |
| `--text` | `#F5F3EE` | `#0C2A43` | Primary/heading text |
| `--muted` | `#B9C4CD` | `#3A3A38` | Body text |
| `--muted2` | `#7C8894` | `#6B6A66` | Muted/tertiary text |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
