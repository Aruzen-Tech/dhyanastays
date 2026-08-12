/**
 * Loading placeholder shaped like ExperienceCard block-for-block (image
 * ratio, then eyebrow → title → location → description → footer row), so
 * real cards swap in with zero layout shift.
 */
export default function ExperienceSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card flex h-full flex-col">
          <div className="aspect-[4/3] shrink-0 bg-gray-100 animate-pulse" />

          <div className="flex flex-1 flex-col p-5">
            <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="mt-2 h-5 w-4/5 rounded bg-gray-100 animate-pulse" />

            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3.5 w-2/5 rounded bg-gray-100 animate-pulse" />
            </div>

            <div className="mt-2.5 space-y-1.5">
              <div className="h-3.5 w-full rounded bg-gray-100 animate-pulse" />
              <div className="h-3.5 w-3/5 rounded bg-gray-100 animate-pulse" />
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="h-3.5 w-14 rounded bg-gray-100 animate-pulse" />
              <div className="h-6 w-20 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
