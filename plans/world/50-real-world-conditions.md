# Real-World Conditions

Purpose: fetch live surf and weather data for real locations, letting players experience actual conditions at famous breaks worldwide.

## Goals
- Authenticity: play Ocean Beach SF with today's actual swell and wind.
- Education: learn to read conditions by seeing how real forecasts translate to waves.
- Variety: every session is different based on real-time data.
- Global: support famous breaks worldwide.

## Data Sources
- **Open-Meteo** (free, no API key required):
  - Marine API: swell height, direction, period
  - Weather API: wind speed/direction, cloud cover, precipitation
  - Sunrise/sunset times for day/night cycle
- Fallback: cached historical data if API unavailable.

## Example Locations
- Ocean Beach, San Francisco
- Pipeline, North Shore Oahu
- Teahupo'o, Tahiti
- Nazaré, Portugal
- Bells Beach, Australia
- Jeffreys Bay, South Africa
- Hossegor, France
- Uluwatu, Bali

## Mechanics
- Location selector with map or list UI.
- Fetch current conditions on level load.
- Map API data to game parameters:
  - `swellHeight` → wave amplitude
  - `swellDirection` → wave angle of approach
  - `swellPeriod` → time between sets
  - `windSpeed/Direction` → surface chop, drift
  - `time of day` → lighting, sky color
- Location-specific bathymetry presets (reef, beach break, point break).

## Integration
- New `conditionsService` module to fetch and cache API data.
- Parameter bridges to `waveModel`, `backgroundWaveModel`, `windModel`.
- UI overlay showing current real conditions.
- Offline mode with last-fetched or curated presets.

## API Example (Open-Meteo Marine)
```
GET https://marine-api.open-meteo.com/v1/marine?
  latitude=37.76&longitude=-122.51
  &hourly=wave_height,wave_direction,wave_period,
          swell_wave_height,swell_wave_direction,swell_wave_period
  &current=wave_height,wave_direction,wave_period
```

## UI/UX
- "Live Conditions" badge when using real-time data.
- Location cards showing current wave height, wind, time.
- Forecast view: play conditions from any hour in the next 7 days.
- Share feature: "I just surfed 8ft Ocean Beach - try it!"

## Testing
- Mock API responses for deterministic tests.
- Integration tests for data mapping accuracy.
- Offline fallback verification.
- Rate limiting and error handling.
