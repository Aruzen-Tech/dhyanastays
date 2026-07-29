"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import {
  MapPin,
  Star,
  Share,
  Heart,
  ChevronRight,
  Users,
  BedDouble,
  Bath,
  Wifi,
  Coffee,
  Car,
  Flame,
  CheckCircle2,
  Calendar as CalendarIcon,
  BookOpen,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { reviews } from "@/lib/mock-data";
import { getPublicListingById } from "@/lib/api";
import { enrichProperty } from "@/lib/content-generator";
import type { Property } from "@/lib/types";

// Resolves a curated-experience icon name (stored as a plain string in the
// generator, same convention as `categories[].icon` in mock-data.ts) to its
// lucide-react component, falling back gracefully for any unmapped name.
function resolveIcon(name: string): LucideIcons.LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;
  return icons[name] ?? LucideIcons.Sparkles;
}

const EMPTY_PROPERTY: Property = {
  id: "",
  name: "Loading stay...",
  slug: "",
  tagline: "",
  description: "",
  story: "",
  category: "Stay",
  location: {
    city: "",
    state: "",
    country: "India",
    coordinates: {
      lat: 0,
      lng: 0,
    },
  },
  images: ["/file.svg"],
  galleryImages: ["/file.svg"],
  price: 0,
  rating: 0,
  reviewCount: 0,
  maxGuests: 2,
  bedrooms: 1,
  bathrooms: 1,
  area: "",
  amenities: [],
  highlights: [],
  host: {
    name: "Dhyana Stays Host",
    avatar: "/file.svg",
    since: "",
    responseRate: "",
    responseTime: "",
    bio: "",
    verified: false,
    languages: [],
  },
  houseRules: [],
  cancellationPolicy: "",
  badges: [],
  isFeatured: false,
  isTrending: false,
  sustainability: [],
};

export default function PropertyDetailsPage() {
  const params = useParams();
  const slug = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id as string);

  const [loadedProperty, setLoadedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const property = loadedProperty ?? EMPTY_PROPERTY;
  const propertyReviews = reviews.filter(
    (review) => review.propertyId === property.id,
  );
  const enriched = enrichProperty(property);

  const [guests, setGuests] = useState(2);
  const [videoFailed, setVideoFailed] = useState(false);
  const [trackedVideoSrc, setTrackedVideoSrc] = useState(enriched.heroVideo);
  const [experiencesOpen, setExperiencesOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!slug) {
      setLoadError("Invalid stay identifier.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadProperty() {
      try {
        setLoading(true);
        setLoadError(null);

        const result = await getPublicListingById(
          slug,
          controller.signal,
        );

        setLoadedProperty(result);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load this stay.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProperty();

    return () => controller.abort();
  }, [slug]);

  // Reset the fallback state when a different property's video is loaded —
  // adjusted during render (React's recommended pattern) rather than in an
  // Effect, since this is a derived reset, not a sync with an external system.
  if (trackedVideoSrc !== enriched.heroVideo) {
    setTrackedVideoSrc(enriched.heroVideo);
    setVideoFailed(false);
  }

  // Gallery modal — ESC to close, lock body scroll while open.
  useEffect(() => {
    if (!galleryOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImage((current) => {
          if (current) return null; // first ESC closes the enlarged image only
          setGalleryOpen(false);
          return current;
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [galleryOpen]);

  // Some browsers don't reliably fire a <video> "error" event for a bad
  // source, so also fall back to the property photo if playback never starts.
  useEffect(() => {
    if (videoFailed) return;
    const watchdog = setTimeout(() => setVideoFailed(true), 8000);
    return () => clearTimeout(watchdog);
  }, [enriched.heroVideo, videoFailed]);

  // Hover or click replays the hero video from the start if it's paused or
  // has ended (including the case where the browser blocked autoplay
  // outright) — and does nothing if it's already playing.
  const replayIfIdle = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.paused) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  // The video plays once on load and then freezes on its poster frame
  // instead of looping — seeking back to 0 without calling play() leaves
  // it paused there until the next hover or click.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => {
      video.currentTime = 0;
    };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [enriched.heroVideo]);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">
            Loading stay...
          </div>
          <p className="mt-2 text-sm text-muted">
            Fetching the latest property information.
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !loadedProperty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Stay unavailable
          </h1>
          <p className="mt-3 text-sm text-muted">
            {loadError || "This stay could not be found."}
          </p>
          <Link
            href="/stays"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Return to stays
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Breadcrumb & Actions */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-subtle">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight size={12} />
            <Link
              href="/stays"
              className="hover:text-foreground transition-colors"
            >
              Stays
            </Link>
            <ChevronRight size={12} />
            <span className="text-muted">{property.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
              <Share size={14} /> Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium text-foreground hover:bg-surface-hover hover:text-red-400 transition-colors">
              <Heart size={14} /> Save
            </button>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="heading-display text-3xl md:text-5xl text-foreground mb-3">
              {property.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <div className="flex items-center gap-1">
                <Star size={14} className="text-primary fill-primary" />
                <span className="font-semibold text-foreground">
                  {property.rating}
                </span>
                <a href="#reviews" className="underline hover:text-foreground">
                  {property.reviewCount} reviews
                </a>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <a href="#location" className="underline hover:text-foreground">
                  {property.location.city}, {property.location.state},{" "}
                  {property.location.country}
                </a>
              </div>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-full">
                {property.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 md:gap-4 h-[300px] md:h-[500px] rounded-2xl overflow-hidden">
          <div
            className="col-span-4 md:col-span-2 row-span-2 bg-surface-hover relative overflow-hidden group"
            onMouseEnter={replayIfIdle}
            onClick={replayIfIdle}
          >
            {videoFailed ? (
              <img
                src={property.images[0]}
                alt={property.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                key={enriched.heroVideo}
                autoPlay
                muted
                playsInline
                preload="metadata"
                poster={property.images[0]}
                onError={() => setVideoFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src={enriched.heroVideo} type="video/mp4" />
              </video>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
          </div>
          {/* Top middle — gallery preview, opens the full gallery modal */}
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={`View more photos of ${property.name}`}
            className="hidden md:block col-span-1 row-span-1 bg-surface-hover overflow-hidden cursor-pointer relative group"
          >
            <img
              src={property.images[1] ?? property.images[0]}
              alt={property.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/95 text-foreground text-sm font-semibold shadow-lg">
                View More <ArrowRight size={14} />
              </span>
            </div>
          </button>

          {/* Top right — "Our Story" card, opens the storytelling modal */}
          <button
            type="button"
            onClick={() => setStoryOpen(true)}
            aria-label={`Discover the story behind ${property.name}`}
            className="hidden md:block col-span-1 row-span-1 bg-surface-hover overflow-hidden cursor-pointer relative group text-left"
          >
            <img
              src={property.images[0]}
              alt={property.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10 group-hover:from-black/90 group-hover:via-black/40 transition-colors duration-300" />
            <div className="absolute inset-x-0 top-0 p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                <Sparkles size={12} /> Our Story
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 transition-transform duration-300 group-hover:-translate-y-1">
              <p className="text-sm font-semibold text-white mb-1 line-clamp-1">
                {property.name}
              </p>
              <p className="text-[11px] text-white/75 leading-relaxed line-clamp-2 mb-2">
                {enriched.generatedStory}
              </p>
              <span className="group/link inline-flex items-center gap-1 text-xs font-medium text-white underline underline-offset-2 group-hover:text-primary transition-colors">
                Read Story
                <ArrowRight size={12} className="transition-transform group-hover/link:translate-x-0.5" />
              </span>
            </div>
          </button>

          {/* Bottom middle — featured curated experience, opens the full list in a modal */}
          <button
            type="button"
            onClick={() => setExperiencesOpen(true)}
            aria-label={`View all curated experiences for ${property.name}`}
            className="hidden md:block col-span-1 row-span-1 bg-surface-hover overflow-hidden cursor-pointer relative group text-left"
          >
            <img
              src={enriched.curatedExperiences[0].image}
              alt={enriched.curatedExperiences[0].name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10 group-hover:from-black/90 group-hover:via-black/40 transition-colors duration-300" />
            <div className="absolute inset-x-0 top-0 p-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                <Sparkles size={12} /> Curated Experiences
              </span>
              <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-white/90 text-foreground rounded-full">
                Featured
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-sm font-semibold text-white mb-2 line-clamp-1">
                {enriched.curatedExperiences[0].name}
              </p>
              <span className="group/link inline-flex items-center gap-1 text-xs font-medium text-white underline underline-offset-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                View All Experiences
                <ArrowRight size={12} className="transition-transform group-hover/link:translate-x-0.5" />
              </span>
            </div>
          </button>

          {/* Bottom right — travel guide / blog mini cards */}
          <div className="hidden md:flex col-span-1 row-span-1 bg-surface flex-col p-3 gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary px-1 mb-1.5">
              Travel Guides
            </p>
            {enriched.blogRecommendations.slice(0, 3).map((guide) => (
              <Link
                key={guide.slug}
                href={`/blog/${guide.slug}`}
                className="group/link flex items-center justify-between gap-2 px-1 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <span className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                  <BookOpen size={11} className="text-sage shrink-0" />
                  <span className="truncate">{guide.title}</span>
                </span>
                <ArrowRight
                  size={11}
                  className="text-subtle group-hover/link:text-primary transition-transform group-hover/link:translate-x-0.5 shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Curated Experiences Modal */}
      {experiencesOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-white/40 backdrop-blur-md animate-fade-in"
          onClick={() => setExperiencesOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-background rounded-3xl shadow-2xl p-5 md:p-8 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="heading-display text-xl md:text-2xl text-foreground">
                  Curated Experiences
                </h3>
                <p className="text-sm text-muted">
                  {enriched.curatedExperiences.length} experiences near {property.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExperiencesOpen(false)}
                aria-label="Close curated experiences"
                className="w-10 h-10 rounded-full bg-surface-hover hover:bg-surface border border-border flex items-center justify-center text-foreground transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {enriched.curatedExperiences.map((experience, i) => (
                <div
                  key={experience.name}
                  className="rounded-2xl border border-border bg-surface overflow-hidden"
                >
                  <div className="relative h-36 overflow-hidden bg-surface-hover">
                    <img
                      src={experience.image}
                      alt={experience.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {i === 0 && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-primary text-primary-foreground rounded-full">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">
                      {experience.name}
                    </h4>
                    <p className="text-xs text-muted leading-relaxed">
                      {experience.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story Modal */}
      {storyOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-white/40 backdrop-blur-md animate-fade-in"
          onClick={() => setStoryOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto bg-background rounded-3xl shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 md:h-80 overflow-hidden rounded-t-3xl bg-surface-hover">
              <img
                src={property.images[0]}
                alt={property.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <button
                type="button"
                onClick={() => setStoryOpen(false)}
                aria-label="Close story"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                  <Sparkles size={12} /> Our Story
                </span>
                <h3 className="heading-display text-2xl md:text-3xl text-white mt-1">
                  {property.name}
                </h3>
              </div>
            </div>

            <div className="p-6 md:p-10">
              <p className="text-muted leading-relaxed mb-8">{enriched.generatedStory}</p>

              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                Timeline
              </h4>
              <div className="space-y-4 mb-8">
                {enriched.storyTimeline.map((entry) => (
                  <div key={entry.label} className="flex gap-4">
                    <span className="w-20 shrink-0 text-xs font-semibold text-foreground">
                      {entry.label}
                    </span>
                    <p className="text-sm text-muted leading-relaxed">{entry.text}</p>
                  </div>
                ))}
              </div>

              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                Gallery
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {property.images.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-hover"
                  >
                    <img
                      src={src}
                      alt={`${property.name} photo ${i + 1}`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Modal — masonry grid of this stay's galleryImages, with a shared-element lightbox on click */}
      <AnimatePresence>
        {galleryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-white/40 backdrop-blur-md"
            onClick={() => {
              setGalleryOpen(false);
              setSelectedImage(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-background rounded-3xl shadow-2xl p-5 md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="heading-display text-xl md:text-2xl text-foreground">Gallery</h3>
                  <p className="text-sm text-muted">
                    {property.galleryImages.length} photos of {property.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGalleryOpen(false);
                    setSelectedImage(null);
                  }}
                  aria-label="Close gallery"
                  className="w-11 h-11 rounded-full bg-surface-hover hover:bg-surface border border-border flex items-center justify-center text-foreground transition-colors shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="columns-2 md:columns-3 gap-3 md:gap-4">
                {property.galleryImages.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSelectedImage(src)}
                    aria-label={`Open photo ${i + 1} larger`}
                    className="group/img block w-full mb-3 md:mb-4 break-inside-avoid rounded-2xl overflow-hidden bg-surface-hover"
                  >
                    <motion.img
                      layoutId={`gallery-${src}`}
                      src={src}
                      alt={`${property.name} photo ${i + 1}`}
                      loading="lazy"
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover/img:scale-105"
                    />
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {selectedImage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6"
                    onClick={() => setSelectedImage(null)}
                  >
                    <motion.img
                      layoutId={`gallery-${selectedImage}`}
                      src={selectedImage}
                      alt={property.name}
                      className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                      }}
                      aria-label="Close enlarged photo"
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-hover hover:bg-surface border border-border flex items-center justify-center text-foreground transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content (Left) */}
          <div className="lg:w-2/3">
            {/* Quick Details */}
            <div className="flex items-center gap-6 pb-8 border-b border-surface-hover">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-foreground">
                  <Users size={18} className="text-primary" />
                  <span className="font-medium">{property.maxGuests} Guests</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-foreground">
                  <BedDouble size={18} className="text-primary" />
                  <span className="font-medium">{property.bedrooms} Bedrooms</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-foreground">
                  <Bath size={18} className="text-primary" />
                  <span className="font-medium">
                    {property.bathrooms} Bathrooms
                  </span>
                </div>
              </div>
            </div>

            {/* Host Section */}
            <div className="py-8 border-b border-surface-hover">
              <div className="flex items-center gap-4">
                <img
                  src={property.host.avatar}
                  alt={property.host.name}
                  className="w-14 h-14 rounded-full object-cover border border-border"
                />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Hosted by {property.host.name}
                  </h3>
                  <p className="text-sm text-muted">
                    Superhost · Hosting since {property.host.since}
                  </p>
                </div>
              </div>
            </div>

            {/* Badges / Highlights */}
            <div className="py-8 border-b border-surface-hover">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <Star size={24} className="text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Highly Rated
                    </h4>
                    <p className="text-sm text-muted mt-1">
                      Recent guests rated this {property.rating} out of 5 stars.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MapPin size={24} className="text-primary" />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Great Location
                    </h4>
                    <p className="text-sm text-muted mt-1">
                      95% of recent guests gave the location a 5-star rating.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Story */}
            <div className="py-8 border-b border-surface-hover" id="story">
              <h2 className="heading-display text-2xl text-foreground mb-4">
                About this space
              </h2>
              <p className="text-muted leading-relaxed mb-6">
                {property.description}
              </p>

              <div className="bg-surface border border-border rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Star size={100} />
                </div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                  The Story
                </h3>
                <p className="text-foreground leading-relaxed italic">
                  "{enriched.generatedStory}"
                </p>
              </div>
            </div>

            {/* Amenities */}
            <div className="py-8 border-b border-surface-hover">
              <h2 className="heading-display text-2xl text-foreground mb-6">
                What this place offers
              </h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {property.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-3 text-muted">
                    <CheckCircle2 size={18} className="text-sage" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
              <button className="mt-6 px-6 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
                Show all amenities
              </button>
            </div>

            {/* Curated Experiences — auto-assigned by stay category */}
            <div className="py-8 border-b border-surface-hover">
              <h2 className="heading-display text-2xl text-foreground mb-6">
                Curated experiences near you
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {enriched.curatedExperiences.map((exp) => {
                  const Icon = resolveIcon(exp.icon);
                  return (
                    <div
                      key={exp.name}
                      className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {exp.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews (Preview) */}
            <div className="py-8 border-b border-surface-hover" id="reviews">
              <div className="flex items-center gap-2 mb-6">
                <Star size={20} className="text-primary fill-primary" />
                <h2 className="heading-display text-2xl text-foreground">
                  {property.rating} · {property.reviewCount} reviews
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {propertyReviews.slice(0, 4).map((review) => (
                  <div key={review.id} className="bg-surface p-5 rounded-2xl border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={review.avatar}
                        alt={review.userName}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{review.userName}</h4>
                        <p className="text-xs text-subtle">{review.date}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted leading-relaxed line-clamp-3">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
              <button className="mt-6 px-6 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
                Show all {property.reviewCount} reviews
              </button>
            </div>

            {/* Blog Recommendations — auto-assigned by stay location */}
            <div className="py-8 border-b border-surface-hover">
              <h2 className="heading-display text-2xl text-foreground mb-2">
                Explore {property.location.city}
              </h2>
              <p className="text-sm text-muted mb-6">
                Guides picked for guests staying near {property.location.city}.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {enriched.blogRecommendations.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/blog/${guide.slug}`}
                    className="group flex items-center gap-3 bg-surface border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-sage/10 text-sage flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <span className="text-sm font-medium text-foreground leading-snug flex-1">
                      {guide.title}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* Map (Placeholder) */}
            <div className="py-8" id="location">
              <h2 className="heading-display text-2xl text-foreground mb-2">
                Where you'll be
              </h2>
              <p className="text-sm text-muted mb-6">
                {property.location.city}, {property.location.state}, {property.location.country}
              </p>
              <div className="w-full h-[400px] bg-surface border border-border rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={32} className="mx-auto text-subtle mb-2" />
                  <p className="text-sm text-subtle">Interactive Map Integration</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar (Right) - Booking Widget */}
          <div className="lg:w-1/3 relative">
            <div className="sticky top-[100px] bg-surface border border-border rounded-2xl p-6 shadow-xl">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-2xl font-bold text-foreground">
                    ₹{property.price.toLocaleString()}
                  </span>
                  <span className="text-muted text-sm"> /night</span>
                </div>
                {property.originalPrice && (
                  <span className="text-sm text-subtle line-through">
                    ₹{property.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Date & Guest Pickers */}
              <div className="border border-border rounded-xl overflow-hidden mb-4">
                <div className="flex border-b border-border">
                  <div className="flex-1 p-3 border-r border-border hover:bg-surface-hover cursor-pointer transition-colors">
                    <div className="text-[10px] uppercase font-bold text-muted mb-1">
                      Check-in
                    </div>
                    <div className="text-sm text-foreground">Add date</div>
                  </div>
                  <div className="flex-1 p-3 hover:bg-surface-hover cursor-pointer transition-colors">
                    <div className="text-[10px] uppercase font-bold text-muted mb-1">
                      Check-out
                    </div>
                    <div className="text-sm text-foreground">Add date</div>
                  </div>
                </div>
                <div className="p-3 hover:bg-surface-hover cursor-pointer transition-colors">
                  <div className="text-[10px] uppercase font-bold text-muted mb-1">
                    Guests
                  </div>
                  <div className="flex items-center justify-between text-sm text-foreground">
                    {guests} {guests > 1 ? "guests" : "guest"}
                    <ChevronRight size={14} className="text-subtle" />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/book/${property.id}`}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center mb-4"
              >
                Reserve
              </Link>
              <p className="text-center text-xs text-muted mb-6">
                You won't be charged yet
              </p>

              {/* Price Breakdown */}
              <div className="space-y-3 text-sm mb-4 pb-4 border-b border-border">
                <div className="flex justify-between text-muted">
                  <span className="underline">₹{property.price.toLocaleString()} x 3 nights</span>
                  <span>₹{(property.price * 3).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="underline">Platform fee</span>
                  <span>₹1,500</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span className="underline">Taxes</span>
                  <span>₹1,200</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Total</span>
                <span>₹{(property.price * 3 + 2700).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
