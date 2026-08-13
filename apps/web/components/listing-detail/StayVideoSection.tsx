'use client';

import { getMockListingImageUrl } from '../../lib/mockListingImage';

/**
 * Placeholder property video — provided directly by the user to stand in
 * until real per-listing videos exist. No such field exists on the Listing
 * type yet (checked lib/types.ts), so this is a frontend-only mock, same
 * "real data now, mock in the meantime" pattern as lib/mockListingImage.ts.
 * Once a real Listing.videoUrl (or similar) field starts flowing in via the
 * `videoUrl` prop below, it takes priority automatically — nothing else
 * here needs to change.
 */
const MOCK_VIDEO_URL = 'https://www.youtube.com/watch?v=mJVuZiK9a6I';

/** 'https://www.youtube.com/watch?v=ID' or 'https://youtu.be/ID' -> embed URL.
 * Returns null for anything else (a direct video file URL), which renders
 * via the native <video> tag instead. */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

interface Props {
  listingId: string;
  title: string;
  /** Real photo if one exists yet, same source the gallery's main tile
   * uses — so the video poster isn't a random unrelated image. */
  posterUrl?: string;
  /** Real per-listing video once that field exists; falls back to the mock above. */
  videoUrl?: string;
}

export default function StayVideoSection({ listingId, title, posterUrl, videoUrl }: Props) {
  const resolvedVideo = videoUrl ?? MOCK_VIDEO_URL;
  const embedUrl = getYouTubeEmbedUrl(resolvedVideo);
  const resolvedPoster = posterUrl ?? getMockListingImageUrl(listingId, 1280, 720);

  return (
    <div className="card shadow-none border-0 flex h-full flex-col p-6 lg:p-7">
      <h2 className="mb-4 font-semibold text-gray-900">Property video</h2>

      <div className="h-72 overflow-hidden rounded-xl bg-gray-900 lg:h-80">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`${title} — property video`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={resolvedVideo} controls className="h-full w-full" poster={resolvedPoster}>
            Your browser doesn&apos;t support embedded video.
          </video>
        )}
      </div>
    </div>
  );
}
