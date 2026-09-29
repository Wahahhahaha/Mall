import { useEffect, useRef } from 'react';
import { Car, MapPin, Navigation, TrainFront } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MallLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface OpeningHour {
  day: string;
  time: string;
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface LocationMapProps {
  location: MallLocation;
  pinLabel?: string;
}

export function LocationMap({ location, pinLabel = 'Mall Location' }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [location.lat, location.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([location.lat, location.lng]).addTo(map);
    marker.bindPopup(`<strong>${pinLabel}</strong><br/>${location.address}`);
    marker.on('click', () => {
      map.flyTo([location.lat, location.lng], 17, { duration: 0.8 });
    });

    mapInstance.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // `location.address` is deliberately excluded: adding it would tear the map
    // down and rebuild it when the settings request resolves, discarding the
    // visitor's pan/zoom and re-fetching tiles. The effect below refreshes the
    // popup text in place instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng, pinLabel]);

  // The map is created once, but the address arrives from the settings request
  // after mount, so the popup text has to be refreshed in place. Rebuilding the
  // map on an address change would throw away the visitor's pan and zoom.
  useEffect(() => {
    markerRef.current?.setPopupContent(`<strong>${pinLabel}</strong><br/>${location.address}`);
  }, [location.address, pinLabel]);

  const centerMap = () => {
    mapInstance.current?.flyTo([location.lat, location.lng], 17, { duration: 0.8 });
  };

  return (
    <div className="location-map-wrap">
      <div ref={mapRef} className="location-map-container" />
      <button type="button" className="location-map-pin" onClick={centerMap} aria-label={`Center map on ${pinLabel}`}>
        <MapPin size={14} /> {pinLabel}
      </button>
    </div>
  );
}

interface LocationCardProps {
  location: MallLocation;
  openingHours?: OpeningHour[];
  title?: string;
  kicker?: string;
  ctaLabel?: string;
}

export function LocationCard({
  location,
  openingHours = [],
  title,
  kicker = 'Location',
  ctaLabel = 'Get Directions',
}: LocationCardProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
  // The MapPin row already shows the full address, so the heading and the parking
  // row reuse only the street portion instead of repeating it. Splitting on the
  // first comma also keeps this correct for an admin-supplied address.
  const street = location.address.split(',')[0].trim() || location.address;
  return (
    <aside className="location-card">
      <span className="location-card-kicker">{kicker}</span>
      <h2 className="location-card-title">{title ?? `Find us at ${street}`}</h2>
      <p className="location-card-row">
        <MapPin size={16} /> {location.address}
      </p>
      <p className="location-card-row">
        <Car size={16} /> Wide parking available from {street}, gate on the north side.
      </p>
      <p className="location-card-row">
        <TrainFront size={16} /> Nearest commuter rail station is 700 m away — take corridor 13 from there.
      </p>

      {openingHours.length > 0 && (
        <dl className="location-hours">
          {openingHours.map((h) => (
            <div key={h.day}>
              <dt>{h.day}</dt>
              <dd>{h.time}</dd>
            </div>
          ))}
        </dl>
      )}

      <a className="location-card-cta" href={mapsUrl} target="_blank" rel="noreferrer">
        <span>{ctaLabel}</span> <Navigation size={16} />
      </a>
    </aside>
  );
}
