// Default location: Boca Raton, FL
const DEFAULT_LOCATION = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes -> description + icon
const WEATHER_CODES = {
  0: ["Clear", "☀️"],
  1: ["Mostly Clear", "🌤️"],
  2: ["Partly Cloudy", "⛅"],
  3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"],
  99: ["Thunderstorm", "⛈️"],
};

const $ = (id) => document.getElementById(id);

function describe(code, isDay = 1) {
  const [text, icon] = WEATHER_CODES[code] || ["Unknown", "🌡️"];
  if (!isDay && code <= 1) return [text, "🌙"];
  return [text, icon];
}

async function getWeather({ name, lat, lon }) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day" +
    "&hourly=temperature_2m,weather_code,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Request failed");
    render(name, await res.json());
  } catch (err) {
    $("condition").textContent = "Couldn't load weather";
  }
}

function render(name, data) {
  const { current, hourly, daily } = data;
  const [text] = describe(current.weather_code, current.is_day);

  document.body.classList.toggle("night", !current.is_day);

  $("city").textContent = name;
  $("temp").textContent = `${Math.round(current.temperature_2m)}°`;
  $("condition").textContent = text;
  $("hilo").textContent =
    `H:${Math.round(daily.temperature_2m_max[0])}°  L:${Math.round(daily.temperature_2m_min[0])}°`;

  $("feels").textContent = `${Math.round(current.apparent_temperature)}°`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} mph`;
  $("uv").textContent = Math.round(daily.uv_index_max[0]);

  // Next 24 hours, starting at the current hour
  const start = hourly.time.findIndex((t) => t >= current.time.slice(0, 13));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      const [, icon] = describe(hourly.weather_code[idx], hourly.is_day[idx]);
      const hour = new Date(t).toLocaleTimeString([], { hour: "numeric" });
      return `<div class="hour">
        <span>${i === 0 ? "Now" : hour}</span>
        <span class="icon">${icon}</span>
        <span>${Math.round(hourly.temperature_2m[idx])}°</span>
      </div>`;
    })
    .join("");

  $("daily").innerHTML = daily.time
    .map((t, i) => {
      const [, icon] = describe(daily.weather_code[i]);
      const day = i === 0 ? "Today" : new Date(t + "T00:00").toLocaleDateString([], { weekday: "short" });
      return `<li>
        <span>${day}</span>
        <span>${icon}</span>
        <span class="range">
          <span class="low">${Math.round(daily.temperature_2m_min[i])}°</span>
          ${Math.round(daily.temperature_2m_max[i])}°
        </span>
      </li>`;
    })
    .join("");
}

// City search using the Open-Meteo geocoding API
$("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("search-input").value.trim();
  if (!query) return;

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
    );
    const data = await res.json();
    if (!data.results?.length) {
      $("condition").textContent = "City not found";
      return;
    }
    const { name, latitude, longitude } = data.results[0];
    getWeather({ name, lat: latitude, lon: longitude });
    $("search-input").value = "";
  } catch (err) {
    $("condition").textContent = "Search failed";
  }
});

getWeather(DEFAULT_LOCATION);
