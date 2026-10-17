# 🚌 Raahi CTU Bus Planner Backend

A production-grade, full-stack **Node.js / Express / MongoDB** backend for **Raahi** — the intelligent Chandigarh Transport Undertaking (CTU) transit planning platform. Engineered with a deterministic routing engine, verified RAG architecture, and an autonomous **LangChain & LangGraph** multi-agent transit recovery workflow.

---

## 🌟 Key Architecture & Capabilities

1. **Deterministic Graph Routing Engine**:
   - Computes direct routes, 1-transfer interchanges, and 2-transfer combinations across 250+ bus stops in under 15ms.
   - Calculates official CTU fare slabs based on travel distance and passenger categories.
   - Enforces timetable-grounded departures and arrivals with 0% schedule hallucination.

2. **Autonomous Transit Agent (LangChain & LangGraph)**:
   - Built on **LangGraph** state machines with dynamic tool-calling (`plan_journey`, `check_route_disruptions`, `calculate_bus_fare`, `recover_missed_transfer`).
   - Automatically handles dynamic real-world disruptions: **VIP movement & convoys, political rallies in Sector 17 / Matka Chowk, Tribune Chowk bottlenecks, and missed ISBT transfers**.
   - Powered by Google Gemini (`gemini-1.5-flash` / `gemini-2.0-flash`) with deterministic fallback.

3. **Continuous First-Mile & Road Corridor Routing**:
   - Integrates OSRM road networks for realistic corridor polyline vectors passing through CTU stops in order.
   - Computes pedestrian and vehicular connector legs from the passenger's live GPS coordinates to the boarding platform, guaranteeing an unbroken, continuous route line on Leaflet maps.

4. **Geocoding & 2dsphere Spatial Queries**:
   - High-speed offline geocoding and reverse geocoding covering Chandigarh, Mohali, Kharar, and Panchkula (Tricity).
   - MongoDB `2dsphere` spatial index enables sub-millisecond radius search for nearby boarding stops.

---

## 🚀 Step-by-Step Setup Guide

Follow these steps to set up, configure, seed, and run the Raahi backend locally.

### Step 1: Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (bundled with Node.js)
- **MongoDB**: Either:
  - **Local MongoDB Community Server** running on `mongodb://127.0.0.1:27017` ([Download MongoDB Community](https://www.mongodb.com/try/download/community-edition)), **OR**
  - **MongoDB Atlas Cloud Database** (Free 512MB M0 tier at [mongodb.com/atlas](https://www.mongodb.com/atlas))
- **Google Gemini API Key** (Free tier for AI Agent & LLM explanations from [Google AI Studio](https://aistudio.google.com/app/apikey))

---

### Step 2: Environment Configuration (`.env`)

1. Open your terminal and navigate to the backend folder:
   ```bash
   cd Raahi/backend
   ```

2. Copy the sample environment file to create your active `.env` file:
   - **Windows (PowerShell):**
     ```powershell
     Copy-Item .env.example .env
     ```
   - **Linux / macOS:**
     ```bash
     cp .env.example .env
     ```

3. Open `.env` in your text editor and fill in your keys. Below is an annotated guide with examples:

```env
# =============================================================================
# Server Configuration
# =============================================================================
PORT=5000
NODE_ENV=development

# =============================================================================
# Database Configuration (MongoDB)
# =============================================================================
# Option A: Local MongoDB Community Server
MONGODB_URI=mongodb://127.0.0.1:27017/raahi

# Option B: MongoDB Atlas Free Cloud Tier (Uncomment and replace with your credentials)
# MONGODB_URI=mongodb+srv://raahi_user:YourSecurePassword123@cluster0.abcde.mongodb.net/raahi?retryWrites=true&w=majority

# =============================================================================
# AI & LLM Services (Google Gemini / LangChain / LangGraph)
# =============================================================================
# Required for:
# - Autonomous LangGraph Transit Agent (/api/routing/agent-chat)
# - RAG Route comparison summaries (/api/routes/plan)
#
# HOW TO GET A FREE GEMINI API KEY:
# 1. Visit Google AI Studio: https://aistudio.google.com/app/apikey
# 2. Sign in with your Google account.
# 3. Click "Create API Key" (choose "Create API key in new project").
# 4. Copy the key (starts with "AIzaSy...") and paste it below:
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere1234567890

# Note: If GEMINI_API_KEY is left blank, the system automatically uses
# deterministic rule-based algorithms with zero errors.

# =============================================================================
# Security & Admin Access
# =============================================================================
# Secret key used for authenticating administrative endpoints (e.g. POST /api/admin/import-pdf)
ADMIN_API_KEY=raahi_ctu_admin_secret_key_2026

# Secret key used to sign and verify passenger session JWT tokens
JWT_SECRET=raahi_jwt_secret_key_chandigarh_bus

# =============================================================================
# Optional Integrations
# =============================================================================
# Optional Live Traffic API Key (e.g. Google Distance Matrix / TomTom).
# If left blank, the system strictly applies verified CTU timetable schedules.
LIVE_TRAFFIC_API_KEY=
```

---

### Step 3: Install Backend Dependencies

Run the following command inside `Raahi/backend`:

```bash
npm install
```

This installs all core dependencies including Express, Mongoose, LangChain (`@langchain/core`, `@langchain/google-genai`, `@langchain/langgraph`), Zod, CORS, and dotenv.

---

### Step 4: Seed CTU Timetable & Stop Database

Seed the database with normalized stop sequences, coordinates, and schedules parsed from official CTU data:

```bash
npm run import
```

> **What this does:** Loads normalized stops, routes, and timetable departures into your MongoDB instance and sets up `2dsphere` spatial indexes for sub-millisecond proximity queries.

---

### Step 5: Start the Backend Development Server

Launch the server with live hot-reloading (nodemon):

```bash
npm run dev
```

You will see:
```text
[Server] Raahi Backend running on port 5000 in development mode
[MongoDB] Connected to database: raahi
[TransitAgent] LangGraph Autonomous Agent initialized successfully with Gemini
```

Verify health by visiting `http://localhost:5000/api/health` in your browser or running:
```bash
curl http://localhost:5000/api/health
```

---

### Step 6: Start the Frontend Application

In a separate terminal window, launch the React client:

```bash
cd ../frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** to access the Raahi web interface.

---

## 📡 API Reference & Example Requests

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Returns server uptime, environment, and database connection status.
- **Example**:
  ```bash
  curl http://localhost:5000/api/health
  ```

---

### 2. Autonomous Transit Agent Chat (LangGraph + LangChain)
- **Endpoint**: `POST /api/routing/agent-chat`
- **Description**: Converses with the autonomous transit agent to solve routes, check live disruptions (VIP movements, rallies), compute fares, or recover missed transfers.
- **Payload**:
  ```json
  {
    "message": "I missed my connecting bus at ISBT 43 because of the VIP rally at Matka Chowk. What are my options?"
  }
  ```
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:5000/api/routing/agent-chat \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"VIP movement in Sector 17, how can I travel from Kharar to High Court?\"}"
  ```

---

### 3. Real-Time Transit Disruptions Feed
- **Endpoint**: `GET /api/routing/disruptions`
- **Description**: Returns active real-world disruptions (VIP convoys, Sector 17 rallies, Matka Chowk bottlenecks, weather delays).
- **Example**:
  ```bash
  curl http://localhost:5000/api/routing/disruptions
  ```

---

### 4. Journey Planning & Route Solver
- **Endpoint**: `POST /api/routes/plan`
- **Description**: Deterministically computes optimal direct and transfer routes between origin and destination.
- **Payload**:
  ```json
  {
    "source": "Kharar",
    "destination": "ISBT 17",
    "preferences": {
      "priority": "all"
    }
  }
  ```
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:5000/api/routes/plan \
    -H "Content-Type: application/json" \
    -d "{\"source\":\"Kharar\",\"destination\":\"ISBT 17\"}"
  ```

---

### 5. Road Geometry & First-Mile Enrichment
- **Endpoint**: `POST /api/routing/enrich-journey`
- **Description**: Enriches a planned journey with full road corridor vectors and continuous walking/auto connector polylines from the user's GPS coordinates.

---

### 6. Stop Search & Autocomplete
- **Endpoint**: `GET /api/stops/search?q=Sector%2017`
- **Example**:
  ```bash
  curl "http://localhost:5000/api/stops/search?q=Kharar"
  ```

---

### 7. Nearby Stops (Spatial 2dsphere Query)
- **Endpoint**: `GET /api/stops/nearby?lat=30.7398&lng=76.7865&radius=2000`
- **Example**:
  ```bash
  curl "http://localhost:5000/api/stops/nearby?lat=30.7488&lng=76.6429&radius=1500"
  ```

---

### 8. Admin Timetable PDF Import (Protected)
- **Endpoint**: `POST /api/admin/import-pdf`
- **Headers**: `x-admin-key: <ADMIN_API_KEY>`
- **Example cURL**:
  ```bash
  curl -X POST http://localhost:5000/api/admin/import-pdf \
    -H "x-admin-key: raahi_ctu_admin_secret_key_2026"
  ```

---

## 🧪 Automated Testing

Run the automated Jest test suite covering routing algorithms, stop normalization, spatial search, and API contracts:

```bash
# Run all test suites
npm test

# Run tests with coverage report
npm test -- --coverage
```

---

## 🔒 Security Best Practices

- Never commit your active `.env` file to source control (`.gitignore` is configured to exclude it).
- Rotate your `ADMIN_API_KEY` and `JWT_SECRET` before deploying to a production server.
- The Google Gemini API key only needs standard Generative Language API access on your Google Cloud console.
