import { useSyncExternalStore } from 'react';
import { SectionHeading, FacilityGrid } from '../../components/landing';
import { getAppSettings, subscribeAppSettings } from '../../components/appSettingsBus';
import { facilities } from './mallData';

function Facilities() {
  const brand = useSyncExternalStore(subscribeAppSettings, getAppSettings);
  return (
    <section className="landing-section">
      <SectionHeading
        title="Mall Facilities"
        sub={`Every facility designed for your comfort while visiting ${brand.appName}.`}
      />
      <FacilityGrid facilities={facilities} />
    </section>
  );
}

export default Facilities;
