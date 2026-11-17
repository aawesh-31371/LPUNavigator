"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Position = [number, number];
type Place = { name: string; position: Position };
type Step = { text: string; distance: number };
type PickMode = "start" | "destination" | null;

/* ---------- constants ---------- */

const CAMPUS_CENTER: Position = [31.2559, 75.704];
const BBOX = { minLon: 75.68, minLat: 31.24, maxLon: 75.73, maxLat: 31.27 };

/**
 * OPTIONAL: exact coordinates for your popular places (most reliable).
 * Keys are lowercase and must match `places[].query` in page.js.
 * Example:  "central library lpu phagwara": [31.2551, 75.7049],
 */
const KNOWN_PLACES: Record<string, Position> = {};

/* ---------- icons ---------- */

const campusIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#b91c1c;border:3px solid white;box-shadow:0 2px 10px #0005"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 10px #0005"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/* ---------- geocoding ---------- */

const cache = new Map<string, Place>();

function inBox([lat, lon]: Position) {
  return (
    lat > BBOX.minLat &&
    lat < BBOX.maxLat &&
    lon > BBOX.minLon &&
    lon < BBOX.maxLon
  );
}

function cleanQuery(q: string) {
  return q
    .replace(/\b(lpu|phagwara|lovely professional university)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "31.25550, 75.70490" -> [31.2555, 75.7049]
function parseLatLng(q: string): Position | null {
  const m = q.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])];
}

async function overpassSearch(
  term: string,
  signal?: AbortSignal
): Promise<Place | null> {
  const safe = term.replace(/[^a-zA-Z0-9 \-]/g, "").trim();
  if (!safe) return null;

  // "Block 30" -> "Block.*30" ; matches name, alt_name, short_name, ref
  const pattern = safe.split(/\s+/).join(".*");
  const bbox = `${BBOX.minLat},${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon}`;
  const q =
    `[out:json][timeout:15];` +
    `nwr[~"^(name|alt_name|short_name|ref)$"~"${pattern}",i](${bbox});` +
    `out center 5;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(q),
    signal,
  });
  if (!res.ok) return null;

  const data = await res.json();
  const el = data.elements?.[0];
  if (!el) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  return { name: el.tags?.name || safe, position: [lat, lon] };
}

async function photonSearch(
  term: string,
  signal?: AbortSignal
): Promise<Place | null> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}` +
    `&limit=10&lat=${CAMPUS_CENTER[0]}&lon=${CAMPUS_CENTER[1]}` +
    `&bbox=${BBOX.minLon},${BBOX.minLat},${BBOX.maxLon},${BBOX.maxLat}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const data = await res.json();
  const hit = data.features?.find((f: any) =>
    inBox([f.geometry.coordinates[1], f.geometry.coordinates[0]])
  );
  if (!hit) return null;

  return {
    name: hit.properties.name || hit.properties.street || term,
    position: [hit.geometry.coordinates[1], hit.geometry.coordinates[0]],
  };
}

async function nominatimSearch(
  term: string,
  signal?: AbortSignal
): Promise<Place | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
    `&q=${encodeURIComponent(term)}` +
    `&viewbox=${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon},${BBOX.minLat}&bounded=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const hit = (await res.json())?.[0];
  if (!hit) return null;

  return {
    name: hit.display_name?.split(",")[0] || term,
    position: [parseFloat(hit.lat), parseFloat(hit.lon)],
  };
}

async function geocode(
  query: string,
  signal?: AbortSignal
): Promise<Place | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  // 1) typed / clicked coordinates
  const coords = parseLatLng(key);
  if (coords) return { name: "Selected point", position: coords };

  // 2) hardcoded places
  if (KNOWN_PLACES[key]) return { name: query.trim(), position: KNOWN_PLACES[key] };

  // 3) cache
  const cached = cache.get(key);
  if (cached) return cached;

  const cleaned = cleanQuery(query);
  if (!cleaned) return null;

  // 4) online search: OSM names -> Photon -> Nominatim
  for (const search of [overpassSearch, photonSearch, nominatimSearch]) {
    try {
      const place = await search(cleaned, signal);
      if (place) {
        cache.set(key, place);
        return place;
      }
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  return null;
}

/* ---------- routing ---------- */

function stepText(s: any): string {
  const type: string = s.maneuver?.type || "";
  const mod: string = s.maneuver?.modifier || "";
  const road = s.name ? ` onto ${s.name}` : "";

  if (type === "depart") return `Start walking${s.name ? " on " + s.name : ""}`;
  if (type === "arrive") return "You have arrived at your destination";
  if (type === "roundabout" || type === "rotary")
    return `Take the roundabout${road}`;
  if (type === "continue" || type === "new name")
    return `Continue ${mod || "straight"}${road}`;
  if (mod === "uturn") return "Make a U-turn";
  return `Turn ${mod || "ahead"}${road}`;
}

async function fetchRoute(a: Position, b: Position) {
  const coords = `${a[1]},${a[0]};${b[1]},${b[0]}`;
  const query = "?overview=full&geometries=geojson&steps=true";

  const services = [
    {
      label: "walking",
      url: `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}${query}`,
    },
    {
      label: "driving",
      url: `https://router.project-osrm.org/route/v1/driving/${coords}${query}`,
    },
  ];

  for (const s of services) {
    try {
      const res = await fetch(s.url);
      const data = await res.json();
      if (data.code === "Ok" && data.routes?.length) {
        const r = data.routes[0];
        const steps: Step[] = (r.legs?.[0]?.steps || []).map((st: any) => ({
          text: stepText(st),
          distance: st.distance,
        }));
        return {
          label: s.label,
          km: r.distance / 1000,
          minutes: Math.max(1, Math.round(r.duration / 60)),
          path: r.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as Position
          ),
          steps,
        };
      }
    } catch {
      // try the next service
    }
  }
  return null;
}

/* ---------- map helpers ---------- */

function MapController({
  focus,
  route,
}: {
  focus: Position | null;
  route: Position[];
}) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (focus && route.length === 0) map.flyTo(focus, 17, { duration: 1.2 });
  }, [focus, route.length, map]);

  useEffect(() => {
    if (route.length > 1) {
      map.fitBounds(L.latLngBounds(route), { padding: [50, 50] });
    }
  }, [route, map]);

  return null;
}

function ClickHandler({
  mode,
  onPick,
}: {
  mode: PickMode;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* ---------- component ---------- */

export default function CampusMap({
  destination,
  start,
  onDestination,
  onStart,
}: {
  destination: string;
  start: string;
  onDestination: (value: string) => void;
  onStart: (value: string) => void;
}) {
  const [destinationPlace, setDestinationPlace] = useState<Place | null>(null);
  const [startPlace, setStartPlace] = useState<Place | null>(null);
  const [route, setRoute] = useState<Position[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<PickMode>(null);

  /* destination lookup */
  useEffect(() => {
    if (!destination.trim()) {
      setDestinationPlace(null);
      setRoute([]);
      setSteps([]);
      setSummary("");
      setMessage("");
      return;
    }

    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setMessage("");
      try {
        const place = await geocode(destination, controller.signal);
        if (controller.signal.aborted) return;

        if (!place) {
          setDestinationPlace(null);
          setRoute([]);
          setSteps([]);
          setMessage(
            "Destination not found. Use 'Set destination' and click the map instead."
          );
          return;
        }
        setDestinationPlace(place);
        if (!start.trim()) {
          setMessage(
            "Now choose a start: type one, tap 'My location', or use 'Set start' and click the map."
          );
        }
      } catch {
        if (!controller.signal.aborted)
          setMessage("Unable to search for this destination.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    const timer = setTimeout(run, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  /* start lookup */
  useEffect(() => {
    if (!start.trim()) {
      setStartPlace(null);
      setRoute([]);
      setSteps([]);
      setSummary("");
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const place = await geocode(start, controller.signal);
        if (controller.signal.aborted) return;
        setStartPlace(place);
        if (!place) {
          setMessage(
            "Starting point not found. Use 'My location' or 'Set start' and click the map."
          );
        }
      } catch {
        if (!controller.signal.aborted)
          setMessage("Unable to find the starting point.");
      }
    }

    const timer = setTimeout(run, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [start]);

  /* route */
  useEffect(() => {
    if (!startPlace || !destinationPlace) {
      setRoute([]);
      setSteps([]);
      setSummary("");
      return;
    }

    const from = startPlace.position;
    const to = destinationPlace.position;
    let cancelled = false;

    async function run() {
      setMessage("Calculating route...");
      const result = await fetchRoute(from, to);
      if (cancelled) return;

      if (!result) {
        setRoute([]);
        setSteps([]);
        setSummary("");
        setMessage("No route found between these two points.");
        return;
      }

      setRoute(result.path);
      setSteps(result.steps);
      setSummary(
        `${result.km.toFixed(2)} km · about ${result.minutes} min (${result.label})`
      );
      setMessage(`Route ready: ${result.km.toFixed(2)} km`);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [startPlace, destinationPlace]);

  /* actions */
  function handlePick(lat: number, lng: number) {
    const value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (mode === "start") onStart(value);
    if (mode === "destination") onDestination(value);
    setMode(null);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support location access.");
      return;
    }
    setMessage("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        onStart(
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        ),
      () =>
        setMessage(
          "Could not get your location. Allow location access, or use 'Set start' and click the map."
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const btn =
    "text-[11px] font-semibold px-3 py-2 rounded-lg shadow border transition ";
  const btnIdle = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";
  const btnActive = "bg-red-700 text-white border-red-700";

  return (
    <div>
      <div className="relative">
        <MapContainer
          center={CAMPUS_CENTER}
          zoom={16}
          scrollWheelZoom
          style={{
            height: 520,
            width: "100%",
            zIndex: 0,
            cursor: mode ? "crosshair" : undefined,
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController
            focus={destinationPlace?.position || null}
            route={route}
          />
          <ClickHandler mode={mode} onPick={handlePick} />

          <Marker position={CAMPUS_CENTER} icon={campusIcon}>
            <Popup>Lovely Professional University</Popup>
          </Marker>

          {destinationPlace && (
            <Marker position={destinationPlace.position} icon={campusIcon}>
              <Popup>Destination: {destinationPlace.name}</Popup>
            </Marker>
          )}

          {startPlace && (
            <Marker position={startPlace.position} icon={userIcon}>
              <Popup>Start: {startPlace.name}</Popup>
            </Marker>
          )}

          {route.length > 0 && (
            <Polyline
              positions={route}
              pathOptions={{ color: "#b91c1c", weight: 5, opacity: 0.85 }}
            />
          )}
        </MapContainer>

        {/* controls */}
        <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className={btn + btnIdle}
          >
            📍 My location
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "start" ? null : "start")}
            className={btn + (mode === "start" ? btnActive : btnIdle)}
          >
            {mode === "start" ? "Click map…" : "Set start on map"}
          </button>
          <button
            type="button"
            onClick={() =>
              setMode(mode === "destination" ? null : "destination")
            }
            className={btn + (mode === "destination" ? btnActive : btnIdle)}
          >
            {mode === "destination" ? "Click map…" : "Set destination on map"}
          </button>
        </div>

        {/* status */}
        <div className="absolute bottom-4 left-4 z-[500] bg-white rounded-lg shadow-lg px-4 py-3 max-w-[85%]">
          <p className="text-xs font-semibold text-slate-800">
            {loading ? "Searching..." : "Campus Map"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {mode
              ? `Click anywhere on the map to set the ${mode}.`
              : message || "Search a destination to explore."}
          </p>
        </div>
      </div>

      {/* turn-by-turn directions */}
      {steps.length > 0 && (
        <div className="border-t border-slate-100 p-4 bg-white">
          <p className="text-sm font-bold">Directions</p>
          <p className="text-xs text-slate-500 mt-1">{summary}</p>
          <ol className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 shrink-0 rounded-full bg-red-50 text-red-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1">{s.text}</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {s.distance >= 1000
                    ? (s.distance / 1000).toFixed(1) + " km"
                    : Math.round(s.distance) + " m"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}