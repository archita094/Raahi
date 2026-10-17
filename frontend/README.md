# 🚌 Raahi — Frontend Web Application

The modern, interactive web client for the **Raahi** Chandigarh CTU Smart Transit & Journey Planner. Built with React 19, Vite, Leaflet.js, and Framer Motion.

---

## 🌟 Application Views

- **Landing Page (`/`)**: Hero transit search with India Standard Time departure options, interactive parallax discovery section, quick route cards, and testimonials.
- **Search Page (`/search`)**: Real-time stop & sector autocomplete search with recent query history, quick sector filters, and location swapping.
- **Results Page (`/results`)**: Multi-route comparison dashboard featuring tabbed filters (*All Routes*, *Direct Bus*, *Bus Change*, *Fastest*, *Cheapest*), route summary metrics, fare calculation, and AI route synthesis.
- **Journey Details Page (`/journey/:id`)**: Full-screen interactive Leaflet map featuring road corridor polylines, discrete bus stop checkpoints, live GPS location tracking with directional compass chevron, step-by-step navigation itinerary, and simulated ticket booking.

---

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 8
- **Routing**: React Router v7
- **Mapping**: Leaflet.js with OpenStreetMap vector tiles & OSRM road geometry
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Styling**: Vanilla CSS design tokens & glassmorphic styling
- **Linter**: Oxlint

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run local development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Lint source code:**
   ```bash
   npm run lint
   ```
