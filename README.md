# 🚌 Raahi — Chandigarh CTU Smart Transit & Journey Planner

Raahi is a modern, high-performance public transit journey planner and urban navigation platform engineered specifically for the **Chandigarh Transport Undertaking (CTU)** bus network across the **Chandigarh Tricity** region (Chandigarh, Mohali, Panchkula, Kharar, and Zirakpur).

---

## 📖 What Raahi Does

Public transit commuters across the Chandigarh Tricity have historically struggled with static PDF timetables, fragmented route schedules, uncertainty about bus interchanges, and missing first-mile/last-mile pedestrian guidance. 

**Raahi solves this by providing a unified, intelligent transit platform that:**

1. **Digitizes the CTU Bus Network**: Indexes 13 major bidirectional corridor routes, over 250 verified bus stops, and official timetable schedules with precise geographic coordinates and distance matrices.
2. **Plans Optimal Multi-Modal Journeys**: Computes direct bus routes, 1-transfer interchange journeys (via central hubs like ISBT 17, ISBT 43, Tribune Chowk, and PGI), walking connectors, and timetable-aligned departure times in under 15ms.
3. **Calculates Official CTU Fares**: Evaluates exact ticket pricing using official CTU distance-based fare slabs for both ordinary (Non-AC) and HVAC/electric bus services.
4. **Visualizes Routes with Road-Level Precision**: Renders continuous, turn-by-turn road polylines using OSRM geometry on an interactive Leaflet map, snapping bus stops onto road vectors and mapping pedestrian first-mile / last-mile walking paths.
5. **Provides AI-Powered Route Tradeoff Summaries**: Leverages Google Gemini via a LangGraph state workflow to generate clear, commuter-friendly journey comparisons (direct vs. transfer tradeoffs, travel times, and connection alerts) grounded strictly in verified transit data with zero hallucination.
6. **Delivers Live Geospatial Navigation**: Displays real-time passenger location tracking, directional heading arrows, discrete intermediate stop checkpoints, and live travel telemetry.

---

## 🏛️ System Architecture

Raahi is built as a decoupled full-stack application featuring an Express REST API backend and a React/Vite client:

```
[ Commuter / Web Browser ]
           │
           ▼
[ React 19 + Vite Frontend ]
   ├── Floating Navigation & Hero Search (IST Time-Synced)
   ├── Multi-Tab Route Comparator (All / Direct / Transfer / Fastest / Cheapest)
   ├── Interactive Leaflet Map (OSRM Vector Corridors, Stop Snapping, GPS Heading)
   └── Step-by-Step Checkpoints Timeline & Fare Breakdown
           │
           │ HTTP / REST API (Port 5000)
           ▼
[ Node.js + Express Backend ]
   ├── Security & Traffic: Helmet, CORS, Rate Limiting
   ├── LangGraph StateGraph Workflow:
   │    ├── validate_input
   │    ├── resolve_locations (Tricity Geocoding & Sector Matching)
   │    ├── find_nearby_stops (MongoDB 2dsphere Geospatial Index)
   │    ├── search_direct_routes & search_transfer_routes (Graph Interchanges)
   │    ├── calculate_route_details (Fare Slabs, Timetables, OSRM Road Distance)
   │    └── prepare_route_instructions & format_final_response
   ├── AI Synthesis: Google Gemini API (with 100% Deterministic Fallback)
   ├── Geospatial Service: OSRM Polyline Generation, Stop-to-Corridor Projection
   └── Database: MongoDB / Mongoose (with automatic MongoMemoryServer fallback)
```

---

## 🌟 Key Features

### 1. Smart Tricity Geocoder & Location Resolver
- Instant offline resolution for all Chandigarh Sectors (Sector 1 through Sector 63+), key landmarks (Rock Garden, Sukhna Lake, Rose Garden), institutions (PGI, Panjab University, PEC, CCET), transit terminals (ISBT 17, ISBT 43, Railway Station, Shaheed Bhagat Singh International Airport), and satellite hubs in Mohali, Kharar, and Panchkula.
- Automatic fallback to OpenStreetMap Nominatim for free-form queries.

### 2. Intelligent Graph Routing Engine
- **Direct Routes**: Identifies continuous bus runs connecting boarding and destination stops without interchanges.
- **1-Transfer Hub Interchanges**: Computes optimal bus combinations switching at major interchange terminals (ISBT Sector 17, ISBT Sector 43, Tribune Chowk, etc.) with realistic layover buffers.
- **Categorized Results**: Allows commuters to toggle between *All Routes*, *Direct Bus*, *Bus Change*, *Fastest*, and *Cheapest*.

### 3. Road-Following Map & First/Last-Mile Walking
- Real road-following geometries via OSRM (Open Source Routing Machine), eliminating artificial straight-line map connections.
- Stop-snapping algorithm projects intermediate bus stops along the road corridor polyline, maintaining correct travel order.
- Calculates dynamic pedestrian walking legs from the commuter's current GPS position to the nearest boarding stop.

### 4. Schedule & Fare Engine
- Synchronized with India Standard Time (IST / Asia/Kolkata).
- Supports "Depart Now" and "Depart Later" departure planning.
- Calculates exact passenger fares matching published Chandigarh Transport Undertaking distance slabs.

### 5. Zero-Config Database Fallback
- Connects to local MongoDB (`mongodb://127.0.0.1:27017/raahi`) or MongoDB Atlas.
- If no MongoDB instance is detected, the backend **automatically launches an in-memory database (`mongodb-memory-server`)** and seeds all 13 routes and 251 stops from the verified dataset with zero configuration required.

---

## 📁 Repository Structure

```text
Raahi/
├── backend/                       # REST API server & routing engine
│   ├── controllers/               # Express request handlers
│   │   ├── adminController.js     # Timetable reload and administrative actions
│   │   ├── healthController.js    # Health check endpoint
│   │   ├── routeController.js     # Route lookup & journey planning triggers
│   │   ├── routingController.js   # Road geometry, polyline snapping, walking paths
│   │   └── stopController.js      # Stop search & nearby stop radius lookups
│   ├── data/                      # Transit datasets
│   │   ├── ctu_distance_routes.json # Verified 13 CTU routes with distances & stops
│   │   ├── ctu_schedules.json     # Timetable departure & frequency matrices
│   │   └── routes_parsed.json     # Parsed route database seeds
│   ├── middleware/                # Express middleware (auth, error handling, validation)
│   ├── models/                    # Mongoose schemas (Route, Stop, FareRule, AdminUser)
│   ├── routes/                    # API route definitions
│   ├── scripts/                   # Data import, inspection, and verification scripts
│   ├── services/                  # Core algorithms & external service connectors
│   │   ├── fareService.js         # CTU official distance fare slab calculator
│   │   ├── geocodingService.js    # Tricity sector & stop coordinate index
│   │   ├── llmService.js          # Google Gemini AI summary client
│   │   ├── routeEngine.js         # Direct & transfer graph search algorithm
│   │   ├── routePlanningGraph.js  # LangGraph StateGraph orchestration workflow
│   │   ├── routingService.js      # OSRM road corridor geometry client
│   │   ├── scheduleService.js     # Timetable schedule & IST time utilities
│   │   ├── trafficService.js      # Traffic delay modeling
│   │   └── transitTools.js        # LangChain tool abstractions
│   ├── tests/                     # Jest & Supertest automated test suites
│   ├── .env.example               # Backend environment variable template
│   ├── package.json               # Backend dependencies and scripts
│   └── server.js                  # Main Express server entry point
│
├── frontend/                      # Client web application (React + Vite)
│   ├── public/                    # Static assets
│   ├── src/
│   │   ├── assets/                # Curated imagery & photography
│   │   ├── components/            # Reusable UI components
│   │   │   ├── AnimatedPage.jsx   # Route transition wrapper (Framer Motion)
│   │   │   ├── AuthModal.jsx      # Passenger authentication modal
│   │   │   ├── FloatingAmbientBackground.jsx # Decorative ambient background
│   │   │   ├── Footer.jsx         # Global page footer
│   │   │   ├── JourneyCheckpoints.jsx # Step-by-step leg and stop itinerary
│   │   │   ├── JourneyMap.jsx     # Interactive Leaflet map with road vectors
│   │   │   └── Navbar.jsx         # Floating capsule navigation bar
│   │   ├── data/                  # Mock and fallback journey datasets
│   │   ├── pages/                 # Full application views
│   │   │   ├── LandingPage.jsx    # Hero search, parallax story, popular routes
│   │   │   ├── SearchPage.jsx     # Full autocomplete transit search
│   │   │   ├── ResultsPage.jsx    # Multi-route comparator with AI insights
│   │   │   └── JourneyDetailsPage.jsx # Turn-by-turn map navigation & ticketing
│   │   ├── services/              # Client API clients (api.js, freeGeocoder.js)
│   │   ├── styles/                # Component & page stylesheets
│   │   ├── App.jsx                # Application root router
│   │   ├── index.css              # Global design tokens and typography
│   │   └── main.jsx               # React DOM entry point
│   ├── index.html                 # HTML template with typography imports
│   ├── package.json               # Frontend dependencies and scripts
│   └── vite.config.js             # Vite build configuration
│
└── README.md                      # Project documentation (this file)
```

---

## ⚙️ Prerequisites

Before running the application, make sure you have installed:
- **Node.js**: v18.x or higher (v20+ recommended)
- **npm**: v9.x or higher
- *(Optional)* **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`). If MongoDB is not installed or running, the backend automatically uses an internal in-memory database (`mongodb-memory-server`).
- *(Optional)* **Google Gemini API Key**: For natural-language route explanations. If omitted, the system operates deterministically with zero errors.

---

## 🚀 Quick Start Guide

### 1. Backend Setup

1. **Navigate to the `backend` folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On Linux / macOS:
   cp .env.example .env
   ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```
   *The server runs at `http://localhost:5000` and automatically syncs the CTU route dataset on startup.*

5. **Verify the backend is live:**
   Visit `http://localhost:5000/api/health` in your browser. You should receive:
   ```json
   {
     "status": "ok",
     "service": "raahi-backend",
     "timestamp": "..."
   }
   ```

---

### 2. Frontend Setup

1. **Open a new terminal and navigate to the `frontend` folder:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (optional):**
   By default, the client points to `http://localhost:5000/api`. If you need custom endpoints, copy the template:
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On Linux / macOS:
   cp .env.example .env
   ```

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`.

---

## 📡 REST API Reference

The backend provides the following endpoints under `/api`:

### Transit & Journey Planning

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/routes/plan` | Plans CTU transit journeys between origin and destination. Supports `{ origin, destination, preferences, timingMode, departureTime }`. |
| `POST` | `/api/routes/search` | Alias for `/api/routes/plan` with identical request format. |
| `GET` | `/api/routes/:routeNumber` | Retrieves complete stop sequence, direction variants, and schedule for a CTU route (e.g. `11`, `35B`, `204`). |
| `GET` | `/api/stops/search?q=:query` | Autocompletes and searches bus stops and landmarks across the Tricity. |
| `GET` | `/api/stops/nearby?lat=:lat&lng=:lng&radius=:meters` | Finds all CTU stops within a given radial distance (in meters). |

### Geospatial & Road Geometry

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/routing/route-geometry?routeNumber=:num&direction=:dir` | Returns the OSRM-based road polyline geometry and snapped stop positions for a route. |
| `POST` | `/api/routing/full-trip-geometry` | Enriches a planned multi-leg journey with continuous road coordinates, walking legs, and intermediate stop nodes. |
| `GET` | `/api/routing/walking-route?fromLat=:lat&fromLng=:lng&toLat=:lat&toLng=:lng` | Computes pedestrian walking geometry and walking time between two coordinates. |

### Administration & System Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health and service availability status. |
| `POST` | `/api/admin/import-pdf` | Imports raw timetable PDFs into structured database records. Requires header `x-admin-key: <ADMIN_API_KEY>`. |
| `POST` | `/api/admin/ctu-dataset/reload` | Triggers a fresh reload and re-index of the CTU distance routes dataset. Requires header `x-admin-key: <ADMIN_API_KEY>`. |

---

## 🧪 Testing & Code Quality

### Run Backend Test Suite
```bash
cd backend
npm test
```
*Runs Jest automated tests verifying route calculations, endpoint responses, PDF extraction, schedule services, and traffic calculations.*

### Validate Frontend Production Build
```bash
cd frontend
npm run build
```
*Validates that Vite bundles all client pages, assets, and styles with zero syntax errors.*

### Run Frontend Linter
```bash
cd frontend
npm run lint
```
*Runs `oxlint` across all frontend React components and services.*

---

## 🗺️ Coverage Area

Raahi provides transit coverage across the entire Chandigarh Capital Region:
- **Chandigarh**: Sectors 1 through 63, Manimajra, Maloya, Dadumajra, Hallomajra, Industrial Area Phase I & II.
- **Mohali (SAS Nagar)**: Sectors 54–82, Phase 1 through 11, Mohali Bus Stand.
- **Panchkula**: Sectors 1 through 21, MDC, Mansa Devi Complex, Old Panchkula.
- **Kharar & Outskirts**: Kharar Bus Stand, Landran, Zirakpur, Airport Road corridor.
- **Major Transport Hubs**: ISBT Sector 17, ISBT Sector 43, Chandigarh Railway Station, Shaheed Bhagat Singh International Airport.
