'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  testimonials,
  totalGuestStoryCount,
  type Testimonial,
} from '../../lib/discover-mock-data';
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconMessageHeart,
  IconQuote,
  IconStar,
  IconThumbsUp,
} from './icons';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'guest-stays', label: 'Guest Stays' },
  { key: 'experiences', label: 'Experiences' },
  { key: 'investors', label: 'Investors' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const AUTOPLAY_MS = 5500;
const READ_MORE_THRESHOLD = 150;
const CARD_GAP_PX = 24;

/**
 * Guest-story carousel — filters, drag-to-scroll, autoplay, expand/collapse,
 * "helpful" votes. All UI-only for now: `testimonials` is static mock
 * content (see lib/discover-mock-data.ts), not fetched from a reviews API.
 */
export default function DiscoverTestimonials() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isFiltering, setIsFiltering] = useState(false);
  const [entered, setEntered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [helpful, setHelpful] = useState<Record<string, boolean>>({});

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const filtered = useMemo(
    () => (filter === 'all' ? testimonials : testimonials.filter((t) => t.category === filter)),
    [filter],
  );

  const showMoreCard = filter === 'all' && totalGuestStoryCount > testimonials.length;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const step = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.firstElementChild as HTMLElement | null;
    const cardWidth = first ? first.getBoundingClientRect().width : track.clientWidth / 3;
    const distance = cardWidth + CARD_GAP_PX;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const maxScroll = scrollWidth - clientWidth;

    if (dir === 1 && scrollLeft >= maxScroll - 4) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (dir === -1 && scrollLeft <= 4) {
      track.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }
    track.scrollBy({ left: dir * distance, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isPaused || isDragging || filtered.length < 2) return;
    const id = setInterval(() => step(1), AUTOPLAY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, isDragging, filter, filtered.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { scrollLeft, scrollWidth, clientWidth } = track;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll <= 0) {
          setActiveIndex(0);
          return;
        }
        const count = filtered.length + (showMoreCard ? 1 : 0);
        setActiveIndex(Math.round((scrollLeft / maxScroll) * (count - 1)));
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [filtered.length, showMoreCard]);

  const goToCard = (id: string) => {
    const el = cardRefs.current[id];
    const track = trackRef.current;
    if (!el || !track) return;
    track.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
  };

  const handleFilterChange = (key: FilterKey) => {
    if (key === filter || isFiltering) return;
    setIsFiltering(true);
    window.setTimeout(() => {
      setFilter(key);
      trackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
      requestAnimationFrame(() => setIsFiltering(false));
    }, 180);
  };

  const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleHelpful = (id: string) => setHelpful((prev) => ({ ...prev, [id]: !prev[id] }));

  const endDrag = () => {
    setIsDragging(false);
    setIsPaused(false);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !trackRef.current) return;
    setIsDragging(true);
    setIsPaused(true);
    dragStart.current = { x: e.clientX, scrollLeft: trackRef.current.scrollLeft };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    trackRef.current.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
  };

  return (
    <section ref={sectionRef} className="py-8 md:py-14 bg-surface">
      <div className="container-page">
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs font-semibold text-brand-700 uppercase tracking-widest">
            Guest Stories
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">
            What Our Guests Say
          </h2>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 sm:mb-10">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => handleFilterChange(f.key)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all ${
                filter === f.key
                  ? 'bg-orange-500 text-white border-orange-500 shadow-card'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Carousel */}
        <div
          className="relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            setIsPaused(false);
            endDrag();
          }}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            className={`relative flex gap-3 sm:gap-6 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 items-start transition-opacity duration-200 ${
              isFiltering ? 'opacity-0' : 'opacity-100'
            } ${isDragging ? 'cursor-grabbing select-none scroll-auto' : 'cursor-grab'}`}
          >
            {filtered.map((t, i) => (
              <TestimonialCard
                key={t.id}
                t={t}
                index={i}
                entered={entered}
                expanded={!!expanded[t.id]}
                onToggleExpand={() => toggleExpanded(t.id)}
                helpful={!!helpful[t.id]}
                onToggleHelpful={() => toggleHelpful(t.id)}
                cardRef={(el) => {
                  cardRefs.current[t.id] = el;
                }}
              />
            ))}

            {showMoreCard && (
              <Link
                href="/reviews"
                className="relative shrink-0 snap-start w-[85%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] p-6 sm:p-8 rounded-2xl sm:rounded-[28px] border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 flex flex-col items-center justify-center text-center gap-3 transition-colors"
              >
                <span className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                  <IconMessageHeart />
                </span>
                <p className="text-base font-semibold text-gray-900">
                  {totalGuestStoryCount - testimonials.length} more guest stories
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500">
                  See all reviews <IconArrowRight />
                </span>
              </Link>
            )}
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent sm:hidden" />

          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous testimonials"
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-card items-center justify-center text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-surface"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next testimonials"
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-card items-center justify-center text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-surface"
          >
            <IconChevronRight />
          </button>
        </div>

        {/* Dot pagination */}
        <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8 flex-wrap">
          {filtered.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goToCard(t.id)}
              aria-label={`Go to testimonial from ${t.name}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === i ? 'w-6 bg-orange-500' : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Closing CTA */}
        <div className="mt-12 sm:mt-16 text-center border-t border-gray-200 pt-10 sm:pt-12">
          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">Share your Dhyana story</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
            Tell future travellers what your stay, experience or investment with us was like.
          </p>
          <Link
            href="/reviews/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold text-sm rounded-full hover:bg-orange-600 transition-all"
          >
            Write a review <IconArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  t,
  index,
  entered,
  expanded,
  onToggleExpand,
  helpful,
  onToggleHelpful,
  cardRef,
}: {
  t: Testimonial;
  index: number;
  entered: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  helpful: boolean;
  onToggleHelpful: () => void;
  cardRef: (el: HTMLElement | null) => void;
}) {
  const delay = Math.min(index, 6) * 90;

  return (
    <div
      ref={cardRef}
      className={`relative shrink-0 snap-start w-[85%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] p-6 sm:p-8 rounded-2xl sm:rounded-[28px] bg-white shadow-card hover:shadow-card-hover transition-[opacity,transform,box-shadow] duration-700 ease-out ${
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: entered ? `${delay}ms` : '0ms' }}
    >
      <IconQuote className="text-brand-700/10 absolute top-6 right-6" />

      <div className="flex items-center gap-3 mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.avatar}
          alt={t.name}
          className="w-12 h-12 rounded-full object-cover border border-gray-200"
        />
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
          <p className="text-xs text-gray-400">{t.location}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {Array.from({ length: t.rating }).map((_, i) => (
          <IconStar key={i} className="text-orange-500" />
        ))}
      </div>

      <p className={`text-sm text-gray-500 leading-relaxed mb-2 ${expanded ? '' : 'line-clamp-3'}`}>
        &ldquo;{t.comment}&rdquo;
      </p>
      {t.comment.length > READ_MORE_THRESHOLD && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-medium text-orange-500 hover:underline mb-4"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}

      <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-gray-100">
        <TestimonialMeta t={t} />
        <button
          type="button"
          onClick={onToggleHelpful}
          aria-pressed={helpful}
          className={`inline-flex items-center gap-1.5 shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all active:scale-90 ${
            helpful
              ? 'bg-orange-50 border-orange-200 text-orange-600'
              : 'border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          <IconThumbsUp className={helpful ? 'fill-current' : ''} />
          {(t.helpfulCount ?? 6) + (helpful ? 1 : 0)}
        </button>
      </div>
    </div>
  );
}

function TestimonialMeta({ t }: { t: Testimonial }) {
  if (t.category === 'experiences') {
    return (
      <p className="text-xs text-gray-400 truncate">
        Experienced{' '}
        {t.experienceId ? (
          <Link href={`/experiences/${t.experienceId}`} className="text-brand-700 font-medium hover:underline">
            {t.stayName}
          </Link>
        ) : (
          <span className="text-brand-700 font-medium">{t.stayName}</span>
        )}
      </p>
    );
  }
  if (t.category === 'investors') {
    return (
      <p className="text-xs text-gray-400 truncate">
        Invested via{' '}
        <Link href="/investor" className="text-brand-700 font-medium hover:underline">
          {t.stayName}
        </Link>
      </p>
    );
  }
  return (
    <p className="text-xs text-gray-400 truncate">
      Stayed at{' '}
      {t.propertySlug ? (
        <Link href={`/stays/${t.propertySlug}`} className="text-brand-700 font-medium hover:underline">
          {t.stayName}
        </Link>
      ) : (
        <span className="text-brand-700 font-medium">{t.stayName}</span>
      )}
    </p>
  );
}
