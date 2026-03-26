# Calgary Free Parking Finder (Next.js + Mapbox)

This app visualizes Calgary’s open **On-Street Parking Zones with Rates** dataset on a Mapbox map and includes a filter for zones that are **free ($0.00) right now**.

## Setup

1. Create an environment file:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (your Mapbox access token)
2. Install dependencies:
   - `npm install`
3. Run the dev server:
   - `npm run dev`
4. Open `http://localhost:3000`

## Free ($0.00) logic

The API route (`src/app/api/parking/route.ts`) computes `isFreeNow` by checking whether the current Calgary local time (America/Edmonton) is **outside** the dataset’s `enforceable_time` windows.

If the time is outside `enforceable_time`, the zone is treated as free ($0.00). Otherwise it’s treated as not-free.

This is a good fit for challenges like “free after 6 PM / free on Sundays”, but it is still a heuristic interpretation of the dataset’s time windows.

## Data source

- Calgary Open Data: `On-Street Parking Zones with Rates` (`45az-7kh9`)

