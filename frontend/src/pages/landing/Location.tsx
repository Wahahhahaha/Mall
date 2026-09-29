import { useSyncExternalStore } from 'react';
import Reveal from '../../components/Reveal';
import { SectionHeading, LocationMap, LocationCard } from '../../components/landing';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import { MALL_LOCATION, openingHours } from './mallData';

function LocationPage() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);

  // The admin only edits the address text, so the coordinates stay bundled, but
  // the address itself must come from settings so an edit in /dashboard/setting
  // shows up here without a redeploy. Falls back to the bundled copy while the
  // settings request is still in flight.
  const location = { ...MALL_LOCATION, address: brand.appAddress || MALL_LOCATION.address };

  return (
    <section className="landing-section">
      <SectionHeading
        title="Visit the Mall"
        sub="Easy to reach by car, bus, or commuter rail."
      />

      <div className="location-layout">
        <Reveal>
          <LocationMap location={location} />
        </Reveal>

        <Reveal delay={140}>
          <LocationCard location={location} openingHours={openingHours} />
        </Reveal>
      </div>
    </section>
  );
}

export default LocationPage;
