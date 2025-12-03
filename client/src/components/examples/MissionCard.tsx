import { MissionCard } from '../vendor/MissionCard';
import { mockMissions } from '@/lib/mock-data';

export default function MissionCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {mockMissions.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          onClick={() => console.log('Mission clicked:', mission.id)}
        />
      ))}
    </div>
  );
}
