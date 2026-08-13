import type { ListingTag } from '../../lib/types';

interface Props {
  tags: ListingTag[];
}

export default function StayAmenities({ tags }: Props) {
  const byCategory: Record<string, string[]> = {};
  tags.forEach((lt) => {
    if (!byCategory[lt.tag.category]) byCategory[lt.tag.category] = [];
    byCategory[lt.tag.category].push(lt.tag.name);
  });

  return (
    <div className="card p-6 lg:p-7">
      <h2 className="mb-4 font-semibold text-gray-900">Amenities &amp; Features</h2>
      <div className="space-y-4">
        {Object.entries(byCategory).map(([category, names]) => (
          <div key={category}>
            <p className="mb-1.5 text-xs font-medium capitalize tracking-wide text-gray-400">{category}</p>
            <div className="flex flex-wrap gap-2">
              {names.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
