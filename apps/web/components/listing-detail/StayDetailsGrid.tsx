import { IconUsers, IconMapPin, IconClock } from '../explore-stays/icons';

interface Props {
  maxGuests: number | undefined;
  country: string;
  timezone: string;
}

/**
 * Only real fields the Listing API returns — no bedroom/bathroom/floor-area
 * counts, since no such fields exist anywhere on the Listing type (checked
 * lib/types.ts). Do not add them without a real backend field to back them.
 */
export default function StayDetailsGrid({ maxGuests, country, timezone }: Props) {
  const items = [
    { icon: IconUsers, label: 'Max guests', value: maxGuests ?? '—' },
    { icon: IconMapPin, label: 'Country', value: country },
    { icon: IconClock, label: 'Timezone', value: timezone },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((d) => (
        <div key={d.label} className="card flex flex-col items-center gap-1.5 p-4 text-center">
          <d.icon className="h-5 w-5 text-brand-700" />
          <div className="text-xs text-gray-500">{d.label}</div>
          <div className="text-sm font-semibold text-gray-900">{String(d.value)}</div>
        </div>
      ))}
    </div>
  );
}
