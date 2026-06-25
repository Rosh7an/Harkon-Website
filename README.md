# HARKON IT Services — Landing Page

Marketing website for HARKON IT Services. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS v3, TypeScript
- **Font**: Bricolage Grotesque (via `next/font/google`)

## Features

- Canvas-based particle system in the hero section
- Typewriter effect cycling service keywords
- 3D fan carousel for the process section
- Scroll-driven animated stats counters
- Auto-advancing testimonials slider
- Custom animated cursor (desktop only)
- Scroll-spy side navigation dots
- Orbit ring CTA animation

## Project Structure

```
app/
  page.tsx          # Home (full SPA with hash-scroll nav)
  layout.tsx
  globals.css
  services/         # Services sub-page
  process/          # Process sub-page
  why/              # Why HARKON sub-page
  contact/          # Contact sub-page

components/
  Nav.tsx           # Fixed top navigation
  SideNav.tsx       # Fixed right-side section dots
  Hero.tsx          # Particle canvas + typewriter + glitch heading
  Marquee.tsx       # Scrolling ticker
  Services.tsx      # Sliding panel with service list
  Process.tsx       # 3D card carousel + tab bar + detail panel
  Stats.tsx         # Animated counters + progress bars
  Testimonials.tsx  # Auto-advancing testimonial slider
  CTA.tsx           # Orbit ring call-to-action
  Footer.tsx
  Cursor.tsx        # Custom green dot cursor
  Why.tsx
  About.tsx
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Design System

| Token | Value | Use |
|---|---|---|
| `--bg` | `#03070a` | Page background |
| `--surface` | `#070e12` | Card/section background |
| `--panel` | `#0b1419` | Panel background |
| `--accent` | `#00ff8c` | Primary green accent |
| `--accent2` | `#00c8ff` | Cyan accent |
| `--accent3` | `#7b61ff` | Purple accent |
| `--accent4` | `#ff6b35` | Orange accent |
| `--text` | `#e8f5f0` | Primary text |
| `--muted` | `rgba(232,245,240,0.42)` | Secondary text |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
