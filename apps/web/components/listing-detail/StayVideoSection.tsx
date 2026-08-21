'use client';

/**
 * "Property video" area — an embedded YouTube player sourced from the host's
 * `Listing.youtubeUrl`. The guest can watch inline or click through to the
 * Dhyana Stays YouTube channel from the player. Renders nothing when no
 * YouTube link is set (the short promo video lives in the photo gallery as a
 * cover, not here).
 */

/** 'https://www.youtube.com/watch?v=ID' or 'https://youtu.be/ID' -> embed URL.
 * Also handles /shorts/ID and /embed/ID. Returns null for anything else. */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.endsWith('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/);
      return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

interface Props {
  title: string;
  /** Host-provided YouTube link. Section hides when empty / not a YouTube URL. */
  youtubeUrl?: string | null;
}

export default function StayVideoSection({ title, youtubeUrl }: Props) {
  const embedUrl = youtubeUrl ? getYouTubeEmbedUrl(youtubeUrl) : null;
  if (!embedUrl) return null;

  return (
    <div className="card shadow-none border-0 flex h-full flex-col p-6 lg:p-7">
      <h2 className="mb-4 font-semibold text-gray-900">Property video</h2>
      <div className="h-72 overflow-hidden rounded-xl bg-gray-900 lg:h-80">
        <iframe
          src={embedUrl}
          title={`${title} — property video`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
