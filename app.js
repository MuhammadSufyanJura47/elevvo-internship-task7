const els = {
  cards: document.getElementById("cards"),
  status: document.getElementById("status"),
  form: document.getElementById("searchForm"),
  input: document.getElementById("searchInput"),
  locBtn: document.getElementById("locBtn"),
};

const DEFAULT_CITIES = ["New York", "London", "Tokyo"];
const STORAGE_KEY = "weather:cities:open-meteo:v1";
const MAX_CITIES = 9;

function setStatus(msg) {
  els.status.style.opacity = "0";
  els.status.style.transform = "translateY(-2px)";
  requestAnimationFrame(() => {
    els.status.textContent = msg || "";
    els.status.style.opacity = "1";
    els.status.style.transform = "translateY(0)";
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/**
 * Open-Meteo geocoding: city -> {name,country,lat,lon}
 * REST: GET https://geocoding-api.open-meteo.com/v1/search?name=...&count=1...
 */
async function geocodeCity(name) {
  const q = encodeURIComponent(name.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`;
  const json = await fetchJson(url);
  const hit = json.results?.[0];
  if (!hit) throw new Error("City not found");
  return {
    name: hit.name,
    country: hit.country_code,
    lat: hit.latitude,
    lon: hit.longitude
  };
}

/**
 * Open-Meteo forecast (includes "current" + "daily"):
 * REST: GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=..&daily=..&forecast_days=4
 */
async function getForecastByCoords(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=4` +
    `&timezone=auto`;

  return fetchJson(url);
}

function loadCities() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  return DEFAULT_CITIES;
}

function saveCities(cities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
}

function modeFromWeatherCode(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3, 45, 48].includes(code)) return "clouds";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "rain";
  if ([71,73,75,77,85,86].includes(code)) return "snow";
  if ([95,96,99].includes(code)) return "thunder";
  return "clouds";
}

function emojiForWeatherCode(code, isDay = true) {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if ([1,2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45,48].includes(code)) return "🌫️";
  if ([51,53,55,56,57].includes(code)) return "🌦️";
  if ([61,63,65,66,67,80,81,82].includes(code)) return "🌧️";
  if ([71,73,75,77,85,86].includes(code)) return "❄️";
  if ([95,96,99].includes(code)) return "⛈️";
  return "☁️";
}

function compute3DayForecastOpenMeteo(forecastJson) {
  const daily = forecastJson.daily;
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const date = daily.time[i];
    out.push({
      key: date,
      label: new Date(date).toLocaleDateString(undefined, { weekday: "short" }),
      code: daily.weather_code[i],
      hi: Math.round(daily.temperature_2m_max[i]),
      lo: Math.round(daily.temperature_2m_min[i]),
    });
  }
  return out;
}

function setBackgroundForMode(mode) {
  if (window.WeatherBG?.setMode) window.WeatherBG.setMode(mode);
}

function cardSkeleton() {
  const div = document.createElement("div");
  div.className = "card skeleton";
  div.innerHTML = `
    <div class="row">
      <div>
        <div class="city">Loading…</div>
        <div class="sub">Fetching weather</div>
      </div>
      <button class="iconbtn" disabled>…</button>
    </div>
    <div class="temp">--°</div>
    <div class="badges">
      <span class="badge">--</span>
      <span class="badge">--</span>
      <span class="badge">--</span>
    </div>
    <div class="forecast">
      <div class="day"></div><div class="day"></div><div class="day"></div>
    </div>
  `;
  return div;
}

function renderCard({ id, title, subtitle, temp, wxEmoji, mode, badges, forecast, onRemove, onRefresh }) {
  const div = document.createElement("article");
  div.className = "card";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="row">
      <div>
        <div class="city">${title}</div>
        <div class="sub">${subtitle}</div>
      </div>
      <div class="actions">
        <button class="iconbtn" data-act="refresh" title="Refresh">↻</button>
        ${onRemove ? `<button class="iconbtn" data-act="remove" title="Remove">✕</button>` : ""}
      </div>
    </div>

    <div class="row" style="margin-top:10px;">
      <div class="temp">${temp}°</div>
      <div style="font-size:44px; line-height:1;" aria-hidden="true" title="${mode}">${wxEmoji}</div>
    </div>

    <div class="badges">
      ${badges.map(b => `<span class="badge">${b}</span>`).join("")}
    </div>

    <div class="forecast">
      ${forecast.map(d => `
        <div class="day">
          <div class="d1">${d.label}</div>
          <div class="d2">
            <div class="wx" aria-hidden="true">${emojiForWeatherCode(d.code, true)}</div>
            <div><span class="hi">${d.hi}°</span><span class="lo">${d.lo}°</span></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  div.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "remove") onRemove?.();
    if (act === "refresh") onRefresh?.();
  });

  // tiny nice touch: set background on hover
  div.addEventListener("mouseenter", () => setBackgroundForMode(mode));

  return div;
}

async function buildCityCard(cityName, { removable = true } = {}) {
  const geo = await geocodeCity(cityName);
  const forecastJson = await getForecastByCoords(geo.lat, geo.lon);

  const current = forecastJson.current;
  const code = current.weather_code;
  const mode = modeFromWeatherCode(code);

  const forecast = compute3DayForecastOpenMeteo(forecastJson);

  return {
    id: `${geo.name},${geo.country}`,
    title: `${geo.name}, ${geo.country}`,
    subtitle: `Weather code ${code}`,
    temp: Math.round(current.temperature_2m),
    wxEmoji: emojiForWeatherCode(code, current.is_day === 1),
    mode,
    badges: [
      `Wind ${Math.round(current.wind_speed_10m)} km/h`,
      `Humidity ${Math.round(current.relative_humidity_2m)}%`,
      `Lat ${geo.lat.toFixed(2)} · Lon ${geo.lon.toFixed(2)}`
    ],
    forecast,
    removable
  };
}

async function refreshAll(cities) {
  setStatus("Updating weather…");
  els.cards.innerHTML = "";

  const skeletons = cities.map(() => cardSkeleton());
  skeletons.forEach(s => els.cards.appendChild(s));

  try {
    const cards = [];
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const card = await buildCityCard(city, { removable: true });
      cards.push(card);

      const view = renderCardView(card, cities);
      els.cards.replaceChild(view, skeletons[i]);
    }

    if (cards[0]) setBackgroundForMode(cards[0].mode);
    setStatus(`Updated: ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
}

function renderCardView(card, cities) {
  return renderCard({
    ...card,
    onRemove: () => {
      // remove by matching the original city string list (case-insensitive)
      const toRemove = card.title.split(",")[0].toLowerCase();
      const next = cities.filter(c => c.toLowerCase() !== toRemove);
      saveCities(next);
      refreshAll(next);
    },
    onRefresh: () => refreshAll(cities)
  });
}

async function addCityFlow(city) {
  const trimmed = city.trim();
  if (!trimmed) return;

  const cities = loadCities();

  if (cities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
    setStatus("City already added.");
    return;
  }

  setStatus(`Adding ${trimmed}…`);
  try {
    // validate quickly by trying to build it once
    await buildCityCard(trimmed, { removable: true });

    const next = [trimmed, ...cities].slice(0, MAX_CITIES);
    saveCities(next);
    await refreshAll(next);
  } catch (err) {
    console.error(err);
    setStatus(`Could not find "${trimmed}". Try adding country hint, e.g. "Paris France".`);
  }
}

async function useMyLocationFlow() {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported in this browser.");
    return;
  }

  setStatus("Requesting location permission…");

  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      setStatus("Fetching your local weather…");

      const forecastJson = await getForecastByCoords(latitude, longitude);
      const current = forecastJson.current;
      const code = current.weather_code;
      const mode = modeFromWeatherCode(code);

      const myCard = {
        id: `my-location`,
        title: `My location`,
        subtitle: `Weather code ${code}`,
        temp: Math.round(current.temperature_2m),
        wxEmoji: emojiForWeatherCode(code, current.is_day === 1),
        mode,
        badges: [
          `Wind ${Math.round(current.wind_speed_10m)} km/h`,
          `Humidity ${Math.round(current.relative_humidity_2m)}%`,
          `Lat ${latitude.toFixed(2)} · Lon ${longitude.toFixed(2)}`
        ],
        forecast: compute3DayForecastOpenMeteo(forecastJson),
        removable: false
      };

      const cities = loadCities();

      els.cards.innerHTML = "";
      els.cards.appendChild(renderCard({
        ...myCard,
        onRemove: null,
        onRefresh: () => useMyLocationFlow()
      }));

      // Render saved cities after the location card
      for (const city of cities) {
        const sk = cardSkeleton();
        els.cards.appendChild(sk);
        const card = await buildCityCard(city, { removable: true });
        els.cards.replaceChild(renderCardView(card, cities), sk);
      }

      setBackgroundForMode(mode);
      setStatus(`Updated: ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error(err);
      setStatus(`Location weather failed: ${err.message}`);
    }
  }, (err) => {
    setStatus(`Location denied/unavailable: ${err.message}`);
  }, { enableHighAccuracy: true, timeout: 12000 });
}

// UI wiring
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  addCityFlow(els.input.value);
  els.input.value = "";
});

els.locBtn.addEventListener("click", () => useMyLocationFlow());

// Boot
(async function init() {
  const cities = loadCities();
  await refreshAll(cities);

  // Optional: auto-fetch location on load (uncomment if desired)
  // useMyLocationFlow();
})();