/*
 * @title: Weather Update
 * @author: thechelsuk
 * @notes: Fetches weather data from OpenWeatherMap
 * and appends to the current draft with markdown formatted data
 */

// === GET CREDENTIALS ===
let credential = Credential.create("OpenWeatherMap", "Enter your API details");
credential.addTextField("CITY", "City Name");
credential.addPasswordField("API_KEY", "OpenWeatherMap API Key");
credential.authorize();

const CITY = credential.getValue("CITY");
const API_KEY = credential.getValue("API_KEY");
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// Build API URL
const url = `${BASE_URL}?q=${CITY}&appid=${API_KEY}&units=metric`;

// Make API request
let http = HTTP.create();
let response = http.request({
    url: url,
    method: "GET",
});

// Check if request was successful
if (!response.success) {
    app.displayErrorMessage("Failed to fetch weather data");
    context.fail();
}

// Parse response
let data = JSON.parse(response.responseText);

// Check API response code
if (data.cod !== 200) {
    app.displayErrorMessage("Weather data not available for " + CITY);
    context.cancel();
}

// Get current date
let now = new Date();
let options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
};
let outputDate = now.toLocaleDateString("en-GB", options);

// Extract weather data
let dayTemp = data.main.temp.toFixed(1);
let feelsLike = data.main.feels_like.toFixed(1);
let dayDesc = data.weather[0].description;
let highTemp = data.main.temp_max.toFixed(1);
let lowTemp = data.main.temp_min.toFixed(1);
let windSpeed = data.wind.speed.toFixed(1);
let visibility = data.visibility;
let pressure = data.main.pressure;
let humidity = data.main.humidity;

// Format sunrise and sunset times
let sunrise = new Date(data.sys.sunrise * 1000);
let sunset = new Date(data.sys.sunset * 1000);
let sunriseTime = sunrise.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
});
let sunsetTime = sunset.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
});

// Build markdown output
let stringToday = `## On ${outputDate}\n\n`;
stringToday += `- The average temperature today is ${dayTemp}˚C\n`;
stringToday += `- With highs of ${highTemp}˚C and lows of ${lowTemp}˚C\n`;
stringToday += `- It may feel like ${feelsLike}˚C with ${dayDesc}\n`;
stringToday += `- The wind speed is ${windSpeed}m/s and visibility is ${visibility}m\n`;
stringToday += `- The pressure is ${pressure}hPa and humidity is ${humidity}%\n`;
stringToday += `- The sun will rise at ${sunriseTime} and set at ${sunsetTime}\n`;

// Append to draft
if (draft.content && draft.content.trim() !== "") {
    draft.content = draft.content + "\n\n" + stringToday;
} else {
    draft.content = stringToday;
}

draft.update();

app.displaySuccessMessage("Weather updated for " + CITY);
