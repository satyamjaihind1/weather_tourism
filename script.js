document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("darkModeToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
    });
  }

  const currentLocBtn = document.getElementById("currentLocationBtn");
  if (currentLocBtn) {
    currentLocBtn.addEventListener("click", getUserLocation);
  }

  // Save Favorite button event
  const saveFavBtn = document.getElementById("saveFavoriteBtn");
  if (saveFavBtn) {
    saveFavBtn.addEventListener("click", saveCurrentLocationAsFavorite);
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);

  loadFavorites(); // Load favorite locations on page load
});

const OPENWEATHER_API_KEY = "b8711879460f8ff8e1ad302732b6de8b"; // Your API Key
let map;

async function loadData() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) {
    alert("Please enter a city");
    return;
  }
  await fetchWeatherAndPlacesByCity(city);
}

async function fetchWeatherAndPlacesByCity(city) {
  try {
    // Fetch current weather
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    if (!weatherRes.ok) {
      document.getElementById("weather").innerText = "City not found or API error.";
      clearOutputs();
      return;
    }
    const weatherData = await weatherRes.json();
    displayWeather(weatherData);
    initMapAndPlaces(weatherData.coord.lat, weatherData.coord.lon);

    // Fetch AQI
    fetchAndDisplayAQI(weatherData.coord.lat, weatherData.coord.lon);

    // Fetch 5-day forecast
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    if (!forecastRes.ok) {
      document.getElementById("forecast").innerHTML = "<p>Failed to load forecast data.</p>";
      return;
    }
    const forecastData = await forecastRes.json();
    displayForecast(forecastData);
    displayHourlyForecast(forecastData);

  } catch (error) {
    console.error("API error:", error);
    document.getElementById("weather").innerText = "Failed to load weather data.";
    clearOutputs();
  }
}

function clearOutputs() {
  document.getElementById("places").innerHTML = "";
  document.getElementById("map").innerHTML = "";
  document.getElementById("forecast").innerHTML = "";
  document.getElementById("hourlyForecast").innerHTML = "";
  document.getElementById("airQuality").innerHTML = "";
}

// Get user location and fetch weather by coordinates
function getUserLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      document.getElementById("cityInput").value = ""; // clear input

      await fetchWeatherAndPlacesByCoords(lat, lng);
    },
    (error) => {
      alert("Unable to retrieve your location.");
      console.error("Geolocation error:", error);
    }
  );
}

async function fetchWeatherAndPlacesByCoords(lat, lng) {
  try {
    // Current weather by coords
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    if (!weatherRes.ok) {
      document.getElementById("weather").innerText = "Weather data not found for your location.";
      clearOutputs();
      return;
    }
    const weatherData = await weatherRes.json();
    displayWeather(weatherData);
    initMapAndPlaces(lat, lng);

    // Fetch AQI
    fetchAndDisplayAQI(lat, lng);

    // 5-day forecast by coords
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    if (!forecastRes.ok) {
      document.getElementById("forecast").innerHTML = "<p>Failed to load forecast data.</p>";
      return;
    }
    const forecastData = await forecastRes.json();
    displayForecast(forecastData);
    displayHourlyForecast(forecastData);

  } catch (error) {
    console.error("API error:", error);
    document.getElementById("weather").innerText = "Failed to load weather data.";
    clearOutputs();
  }
}

// Display current weather
function displayWeather(data) {
  const city = data.name;
  const temp = data.main.temp;
  const condition = data.weather[0].description;
  const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  document.getElementById("weather").innerHTML = `
    <h2>Weather in ${city}</h2>
    <p>Temperature: ${temp} °C</p>
    <p>Condition: ${condition}</p>
    <p>Sunrise: ${sunrise}</p>
    <p>Sunset: ${sunset}</p>
  `;

  updateBackground(condition);
}

function updateBackground(condition) {
  const body = document.body;
  body.classList.remove("clear", "clouds", "rain", "snow", "thunderstorm", "mist", "fog");

  const cond = condition.toLowerCase();
  if (cond.includes("clear")) body.classList.add("clear");
  else if (cond.includes("cloud")) body.classList.add("clouds");
  else if (cond.includes("rain") || cond.includes("drizzle")) body.classList.add("rain");
  else if (cond.includes("snow")) body.classList.add("snow");
  else if (cond.includes("thunderstorm")) body.classList.add("thunderstorm");
  else if (cond.includes("mist") || cond.includes("fog") || cond.includes("haze")) body.classList.add("mist");
  else body.classList.add("clear");
}

// Display 5-day forecast (around 12:00 each day)
function displayForecast(data) {
  const dailyData = data.list.filter(item => item.dt_txt.includes("12:00:00"));

  const forecastHTML = dailyData.map(item => {
    const date = new Date(item.dt * 1000);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateStr = date.toLocaleDateString(undefined, options);
    const temp = item.main.temp.toFixed(1);
    const desc = item.weather[0].description;
    const icon = item.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}.png`;

    return `
      <div class="forecast-day">
        <h4>${dateStr}</h4>
        <img src="${iconUrl}" alt="${desc}" />
        <p>${temp} °C</p>
        <p>${desc}</p>
      </div>
    `;
  }).join("");

  document.getElementById("forecast").innerHTML = `
    <h2>5-Day Forecast</h2>
    <div class="forecast-container">${forecastHTML}</div>
  `;
}

// Display hourly forecast (next 12 hours)
function displayHourlyForecast(data) {
  const now = Date.now();
  const next12HoursData = data.list.filter(item => (item.dt * 1000) > now).slice(0, 4);

  const hourlyHTML = next12HoursData.map(item => {
    const date = new Date(item.dt * 1000);
    const options = { hour: 'numeric', hour12: true };
    const timeStr = date.toLocaleTimeString(undefined, options);
    const temp = item.main.temp.toFixed(1);
    const desc = item.weather[0].description;
    const icon = item.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}.png`;

    return `
      <div class="forecast-day">
        <h4>${timeStr}</h4>
        <img src="${iconUrl}" alt="${desc}" />
        <p>${temp} °C</p>
        <p>${desc}</p>
      </div>
    `;
  }).join("");

  document.getElementById("hourlyForecast").innerHTML = `
    <h2>Hourly Forecast (Next 12 hours)</h2>
    <div class="forecast-container">${hourlyHTML}</div>
  `;
}

// Fetch and display Air Quality Index data
async function fetchAndDisplayAQI(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
    );
    if (!res.ok) {
      document.getElementById("airQuality").innerText = "Failed to load air quality data.";
      return;
    }
    const data = await res.json();
    displayAQI(data);
  } catch (error) {
    console.error("AQI API error:", error);
    document.getElementById("airQuality").innerText = "Failed to load air quality data.";
  }
}

function displayAQI(data) {
  if (!data.list || data.list.length === 0) {
    document.getElementById("airQuality").innerText = "No air quality data available.";
    return;
  }
  const aqi = data.list[0].main.aqi;
  const components = data.list[0].components;

  const aqiLevels = {
    1: { label: "Good", color: "green" },
    2: { label: "Fair", color: "yellowgreen" },
    3: { label: "Moderate", color: "orange" },
    4: { label: "Poor", color: "red" },
    5: { label: "Very Poor", color: "purple" },
  };

  const level = aqiLevels[aqi] || { label: "Unknown", color: "gray" };

  document.getElementById("airQuality").innerHTML = `
    <h2>Air Quality Index</h2>
    <p><strong style="color:${level.color};">${level.label} (AQI: ${aqi})</strong></p>
    <p>PM2.5: ${components.pm2_5} μg/m³</p>
    <p>PM10: ${components.pm10} μg/m³</p>
    <p>O₃ (Ozone): ${components.o3} μg/m³</p>
    <p>NO₂ (Nitrogen Dioxide): ${components.no2} μg/m³</p>
  `;
}

// Map and tourist places initialization
function initMapAndPlaces(lat, lng) {
  const location = { lat, lng };

  map = new google.maps.Map(document.getElementById("map"), {
    center: location,
    zoom: 13,
  });

  const radius = 10000;
  const query = `
    [out:json];
    (
      node["tourism"="attraction"](around:${radius},${lat},${lng});
      way["tourism"="attraction"](around:${radius},${lat},${lng});
      relation["tourism"="attraction"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.elements || data.elements.length === 0) {
        document.getElementById("places").innerHTML = "<p>No tourist attractions found nearby.</p>";
        return;
      }

      const placesList = data.elements.map(el => {
        const name = el.tags?.name || "Unnamed attraction";
        return `<li>${name}</li>`;
      }).join("");

      document.getElementById("places").innerHTML = `
        <h2>Tourist Attractions Nearby</h2>
        <ul>${placesList}</ul>
      `;

      data.elements.forEach(el => {
        let latlng;
        if (el.type === "node") {
          latlng = { lat: el.lat, lng: el.lon };
        } else if (el.type === "way" || el.type === "relation") {
          latlng = { lat: el.center.lat, lng: el.center.lon };
        }

        if (latlng) {
          new google.maps.Marker({
            position: latlng,
            map,
            title: el.tags?.name || "Tourist Attraction",
          });
        }
      });
    })
    .catch(err => {
      console.error("Overpass API error:", err);
      document.getElementById("places").innerHTML = "<p>Failed to load tourist attractions.</p>";
    });
}

// Show current date & time
function updateDateTime() {
  const now = new Date();
  const options = { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
  };
  const dateTimeStr = now.toLocaleString(undefined, options);
  document.getElementById("dateTime").innerText = dateTimeStr;
}

/* -------------- FAVORITES FEATURE -------------- */

// Load favorites from localStorage and display them
function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem("favoriteLocations")) || [];
  const listEl = document.getElementById("favoritesList");
  if (!listEl) return; // If favorites section doesn't exist, skip

  listEl.innerHTML = "";

  favorites.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.style.cursor = "pointer";

    // Click to load weather for favorite city
    li.addEventListener("click", () => {
      document.getElementById("cityInput").value = city;
      loadData();
    });

    // Add a remove button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✖";
    removeBtn.style.marginLeft = "10px";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering the li click event
      removeFavorite(city);
    });

    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

// Save the current city as favorite
function saveCurrentLocationAsFavorite() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) {
    alert("Enter a city to save as favorite.");
    return;
  }

  let favorites = JSON.parse(localStorage.getItem("favoriteLocations")) || [];

  if (!favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("favoriteLocations", JSON.stringify(favorites));
    loadFavorites();
    alert(`Saved "${city}" to favorites!`);
  } else {
    alert(`"${city}" is already in favorites.`);
  }
}

// Remove a city from favorites
function removeFavorite(city) {
  let favorites = JSON.parse(localStorage.getItem("favoriteLocations")) || [];
  favorites = favorites.filter(favCity => favCity !== city);
  localStorage.setItem("favoriteLocations", JSON.stringify(favorites));
  loadFavorites();
}
