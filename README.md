# Task 7 — Real‑Time Weather Dashboard (API) + Three.js Dynamic Background

## Introduction
This is **Task 7** of my **Elevvo Front-End Web Development Tasks** series.  
It’s a clean, minimal **weather dashboard** that fetches and displays **real-time weather** for multiple cities, including key details like temperature, wind, humidity, and a **3‑day forecast**.

To make the UI more immersive, the app also includes a **Three.js animated background** that changes based on the current weather condition (clear, clouds, rain, snow, thunder). The project is front-end only and uses the **Open‑Meteo API** (free, no API key required).

## Key Features / Functions
### 1) Multi‑City Weather Cards
- Displays weather in a responsive grid of cards.
- Each card shows:
  - City + country
  - Current temperature
  - Weather emoji based on weather code + day/night
  - Badges for wind speed, humidity, and coordinates
  - A **3-day forecast** panel (hi/lo + icons)

### 2) City Search + Persistence
- Add a new city using the search input.
- Prevents duplicate cities (case-insensitive).
- Saves the city list to **localStorage** and reloads it on refresh.
- Limits the list to a maximum of **9 cities** to keep the UI clean.

### 3) Refresh + Remove Actions
- Each city card has:
  - **Refresh** button (re-fetch weather)
  - **Remove** button (delete city from saved list)
- Includes loading skeleton cards while data is being fetched.

### 4) “Use My Location” (Bonus)
- Uses browser **Geolocation API** to fetch weather for the user’s current coordinates.
- Renders a non-removable “My location” card first, then loads saved cities after it.
- Handles permission denial / unavailable location gracefully with status messages.

### 5) Open‑Meteo API Integration (No Key Needed)
- Uses Open‑Meteo **geocoding** endpoint to convert city → lat/lon.
- Uses Open‑Meteo **forecast** endpoint to fetch:
  - current temperature, wind speed, humidity, weather code, day/night flag
  - daily min/max temps + codes for forecast
- Converts Open‑Meteo weather codes into:
  - UI emoji icons
  - background “mode” states

### 6) Three.js Background That Reacts to Weather
- Fullscreen canvas behind the UI (`#bg`).
- A lightweight particle scene that switches behavior based on weather mode:
  - **Clear:** calm particles + visible “sun”
  - **Clouds:** softer particle look
  - **Rain:** faster downward motion
  - **Snow:** slow falling drift
  - **Thunder:** flashing overlay effect
- The card hover also updates the background mode (nice UX touch).

## Tech Stack / Tools Used
- **HTML5**
- **CSS3**
  - Responsive grid layout
  - Glass-like panels using blur + transparency
  - Skeleton shimmer loading state
- **JavaScript (Vanilla)**
  - Fetch API + async/await
  - DOM rendering for cards and UI state
  - localStorage persistence
  - Geolocation API (bonus)
- **Open‑Meteo API**
  - Geocoding + Forecast endpoints (no API key required)
- **Three.js**
  - WebGLRenderer + Scene + Camera
  - Particle system using `THREE.Points`
  - Weather-mode driven animation and visuals

## How to Run Locally
1. Clone/download the repository.
2. Open `index.html` in a modern browser.
3. Search a city, add/remove cards, or click **Use my location**.

## Notes
- This project is **front-end only** and uses **mock-free live API data**.
- Open‑Meteo is free and does not require an API key (configured in `config.js`).

---
✅ *Completed as part of the Elevvo internship front-end task set.*
