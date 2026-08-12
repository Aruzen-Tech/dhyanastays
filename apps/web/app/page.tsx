'use client';

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LatLngBounds } from 'leaflet';
import dynamic from 'next/dynamic';
import ListingCard from '../components/ListingCard';
import ExploreHero from '../components/explore-stays/ExploreHero';
import ExploreHeader from '../components/explore-stays/ExploreHeader';
import FilterPanel from '../components/explore-stays/FilterPanel';
import StayToolbar from '../components/explore-stays/StayToolbar';
import ActiveFilterChips from '../components/explore-stays/ActiveFilterChips';
import StayEditorialGrid from '../components/explore-stays/StayEditorialGrid';
import Pagination from '../components/explore-stays/Pagination';
import SkeletonGrid from '../components/explore-stays/SkeletonGrid';
import EmptyState from '../components/explore-stays/EmptyState';
import ErrorState from '../components/explore-stays/ErrorState';
import { listingsApi } from '../lib/api';
import {
  normalizeDiscoveryTagUrlState,
  normalizeDiscoveryUrlState,
  parseDiscoveryTagCandidates,
} from '../lib/discovery-url-state';
import { EXPLORE_CONTAINER_CLASS } from '../lib/exploreLayout';
import type { DiscoverySort, Listing, Tag } from '../lib/types';
import {
  DIETARY_OPTIONS,
  EXPERIENCE_TAGS,
  PROPERTY_TYPES,
} from '../lib/types';

const ListingMap = dynamic(() => import('../components/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading map...</span>
    </div>
  ),
});

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type ViewMode = 'grid' | 'map' | 'split';

// The public /listings API has no page/limit/total contract (confirmed by
// reading lib/api.ts and the backend's PublicListingController — it always
// returns the full matching array), so there's no existing page size to
// reuse. 9 is a new, purely presentational choice: it divides evenly into
// StayEditorialGrid's 3-column desktop layout (exactly 3 full rows) with no
// dangling partial row.
const RESULTS_PAGE_SIZE = 9;

type SearchSuggestion = {
  label: string;
  value: string;
  type: 'Stay' | 'City' | 'State';
  secondary?: string;
};

type TagMetadataStatus = 'loading' | 'ready' | 'failed';

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;

  return left.every((value, index) => value === right[index]);
}

function MapStatusOverlay({
  loading,
  error,
  empty,
  announceState = true,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  announceState?: boolean;
}) {
  if (!loading && !error && !empty) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center px-4">
      <div className="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-sm shadow-lg backdrop-blur">
        {loading && (
          <div className="flex items-center gap-2 text-gray-700">
            <span className="spinner h-4 w-4 text-brand-700" />
            Searching this map area...
          </div>
        )}

        {!loading && error && (
          <div
            className="text-red-600"
            role={announceState ? 'alert' : undefined}
          >
            Unable to load stays for this area.
          </div>
        )}

        {!loading && !error && empty && (
          <div
            className="text-gray-600"
            role={announceState ? 'status' : undefined}
            aria-live={announceState ? 'polite' : undefined}
            aria-atomic={announceState ? 'true' : undefined}
          >
            No stays found in this map area. Move or zoom the map to explore.
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [mapListings, setMapListings] = useState<Listing[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [hasLoadedMapBounds, setHasLoadedMapBounds] = useState(false);
  const mapRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const mapAbortControllerRef = useRef<AbortController | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagMetadataStatus, setTagMetadataStatus] =
    useState<TagMetadataStatus>('loading');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // Client-side pagination over `results` — see RESULTS_PAGE_SIZE above for
  // why this isn't wired to the API. Grid-view-only (map/split keep showing
  // every result in view, unpaginated — see visibleMapListings below, which
  // is untouched by this and still derives from the full `results` array).
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null,
  );

  const listingCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resultsSectionRef = useRef<HTMLElement>(null);
  // `showFilters` (below) still drives the existing URL-restoration logic
  // further down (applyUrlState) — left untouched. `filtersOpen` is the new,
  // purely presentational flag for the on-demand FilterPanel (opened via the
  // toolbar's "Filters" button at every breakpoint — no more permanently
  // visible rail).
  const [showFilters, setShowFilters] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Lets the restyled error state re-run the exact same initial fetch below
  // (no new endpoint/logic — just a dependency bump on the existing effect).
  const [retryTick, setRetryTick] = useState(0);
  const [urlStateReady, setUrlStateReady] = useState(false);
  const restoringUrlStateRef = useRef(false);
  const pendingUrlTagCandidatesRef = useRef<string[]>([]);

  // Filter state
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterGuests, setFilterGuests] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Discovery facets (§5.18) — server-side
  const [filterExperienceTags, setFilterExperienceTags] = useState<string[]>([]);
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterDietary, setFilterDietary] = useState<string[]>([]);
  const [filterSort, setFilterSort] = useState<DiscoverySort | ''>('');

  const debouncedSearch = useDebounce(search, 350);
  const validTagIds = useMemo(() => allTags.map((tag) => tag.id), [allTags]);

  const applyUrlState = useCallback(() => {
    const params = new URLSearchParams(window.location.search);

    const normalizedUrlState = normalizeDiscoveryUrlState(params, {
      validExperienceTags: EXPERIENCE_TAGS,
      validPropertyTypes: PROPERTY_TYPES,
      validDietaryOptions: DIETARY_OPTIONS,
    });
    const pendingTagCandidates = parseDiscoveryTagCandidates(params);
    pendingUrlTagCandidatesRef.current = pendingTagCandidates;

    let activeTagIds: string[] = [];
    let canonicalParams = normalizedUrlState.canonicalParams;

    if (tagMetadataStatus === 'ready') {
      const normalizedTagState = normalizeDiscoveryTagUrlState(
        canonicalParams,
        validTagIds,
      );

      activeTagIds = normalizedTagState.tagIds;
      canonicalParams = normalizedTagState.canonicalParams;
      pendingUrlTagCandidatesRef.current = activeTagIds;
    }

    setSearch(normalizedUrlState.q);
    setFilterState(normalizedUrlState.state);
    setFilterGuests(normalizedUrlState.guests);
    setFilterMinPrice(normalizedUrlState.minPrice);
    setFilterMaxPrice(normalizedUrlState.maxPrice);
    setFilterTags(activeTagIds);
    setFilterExperienceTags(normalizedUrlState.experiences);
    setFilterPropertyType(normalizedUrlState.propertyType);
    setFilterDietary(normalizedUrlState.dietary);
    setFilterSort(normalizedUrlState.sort);

    const hasUrlFilters =
      Boolean(normalizedUrlState.state) ||
      Boolean(normalizedUrlState.guests) ||
      Boolean(normalizedUrlState.minPrice) ||
      Boolean(normalizedUrlState.maxPrice) ||
      activeTagIds.length > 0 ||
      normalizedUrlState.experiences.length > 0 ||
      Boolean(normalizedUrlState.propertyType) ||
      normalizedUrlState.dietary.length > 0 ||
      Boolean(normalizedUrlState.sort);

    setShowFilters(hasUrlFilters);
    setViewMode(normalizedUrlState.view);

    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);

    const canonicalQuery = canonicalParams.toString();
    const currentUrl =
      `${window.location.pathname}` +
      `${window.location.search}` +
      `${window.location.hash}`;
    const canonicalUrl =
      `${window.location.pathname}` +
      `${canonicalQuery ? `?${canonicalQuery}` : ''}` +
      `${window.location.hash}`;

    if (canonicalUrl !== currentUrl) {
      window.history.replaceState(
        window.history.state,
        '',
        canonicalUrl,
      );
    }
  }, [tagMetadataStatus, validTagIds]);

  useEffect(() => {
    restoringUrlStateRef.current = true;
    applyUrlState();
    setUrlStateReady(true);

    const handlePopState = () => {
      restoringUrlStateRef.current = true;
      applyUrlState();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyUrlState]);

  useEffect(() => {
    if (!urlStateReady) return;

    if (restoringUrlStateRef.current) {
      if (debouncedSearch === search) {
        restoringUrlStateRef.current = false;
      }

      return;
    }

    const params = new URLSearchParams(window.location.search);

    const setOrDelete = (key: string, value: string) => {
      const normalizedValue = value.trim();

      if (normalizedValue) {
        params.set(key, normalizedValue);
      } else {
        params.delete(key);
      }
    };

    setOrDelete('q', debouncedSearch);
    setOrDelete('state', filterState);
    setOrDelete('guests', filterGuests);
    setOrDelete('minPrice', filterMinPrice);
    setOrDelete('maxPrice', filterMaxPrice);
    setOrDelete('propertyType', filterPropertyType);
    setOrDelete('sort', filterSort);

    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    } else {
      params.delete('view');
    }

    if (tagMetadataStatus === 'ready') {
      if (filterTags.length > 0) {
        params.set('tags', filterTags.join(','));
      } else {
        params.delete('tags');
      }
    }

    if (filterExperienceTags.length > 0) {
      params.set(
        'experiences',
        filterExperienceTags.join(','),
      );
    } else {
      params.delete('experiences');
    }

    if (filterDietary.length > 0) {
      params.set('dietary', filterDietary.join(','));
    } else {
      params.delete('dietary');
    }

    const query = params.toString();

    const nextUrl =
      `${window.location.pathname}` +
      `${query ? `?${query}` : ''}` +
      `${window.location.hash}`;

    const currentUrl =
      `${window.location.pathname}` +
      `${window.location.search}` +
      `${window.location.hash}`;

    if (nextUrl === currentUrl) return;

    window.history.pushState(
      window.history.state,
      '',
      nextUrl,
    );
  }, [
    search,
    debouncedSearch,
    viewMode,
    filterState,
    filterGuests,
    filterMinPrice,
    filterMaxPrice,
    filterTags,
    filterExperienceTags,
    filterPropertyType,
    filterDietary,
    filterSort,
    urlStateReady,
    tagMetadataStatus,
  ]);

  const handleListingSelect = useCallback((listingId: string) => {
    setSelectedListingId(listingId);

    window.requestAnimationFrame(() => {
      listingCardRefs.current[listingId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, []);

  const visibleMapListings = useMemo(() => {
    const resultIds = new Set(results.map((listing) => listing.id));

    return mapListings.filter((listing) => resultIds.has(listing.id));
  }, [mapListings, results]);

  // Pagination is a pure view over `results` — every existing search/filter
  // effect already fully recomputes `results` on its own; this only resets
  // which page of that (possibly new) set is showing, same as any standard
  // "new result set → back to page 1" pagination behavior.
  const totalPages = Math.max(1, Math.ceil(results.length / RESULTS_PAGE_SIZE));
  const paginatedResults = useMemo(
    () => results.slice((currentPage - 1) * RESULTS_PAGE_SIZE, currentPage * RESULTS_PAGE_SIZE),
    [results, currentPage],
  );

  // useLayoutEffect (not useEffect): resolves before paint, so switching to
  // a new result set while parked on, say, page 3 never briefly renders
  // "page 3 sliced from the new results" before snapping to page 1.
  useLayoutEffect(() => {
    setCurrentPage(1);
  }, [results]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (!selectedListingId) return;

    const selectedListingIsVisible = visibleMapListings.some(
      (listing) => listing.id === selectedListingId,
    );

    if (!selectedListingIsVisible) {
      setSelectedListingId(null);
    }
  }, [selectedListingId, visibleMapListings]);

  useEffect(() => {
    if (!hoveredId) return;

    const hoveredListingIsVisible = visibleMapListings.some(
      (listing) => listing.id === hoveredId,
    );

    if (!hoveredListingIsVisible) {
      setHoveredId(null);
    }
  }, [hoveredId, visibleMapListings]);

  useEffect(() => {
    if (viewMode !== 'split') {
      setHoveredId(null);
    }
  }, [viewMode]);

  const showMapEmptyState =
    hasLoadedMapBounds &&
    !mapLoading &&
    !mapError &&
    visibleMapListings.length === 0;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    // One price bucket sets both min and max at once — count as one filter.
    if (filterMinPrice || filterMaxPrice) n++;
    if (filterGuests) n++;
    if (filterState) n++;
    n += filterTags.length;
    n += filterExperienceTags.length;
    if (filterPropertyType) n++;
    n += filterDietary.length;
    if (filterSort) n++;
    return n;
  }, [
    filterMinPrice,
    filterMaxPrice,
    filterGuests,
    filterState,
    filterTags,
    filterExperienceTags,
    filterPropertyType,
    filterDietary,
    filterSort,
  ]);

  const uniqueStates = useMemo(
    () => [...new Set(allListings.map((l) => l.state).filter(Boolean))].sort(),
    [allListings],
  );

  // Filter option vocabularies — derived from the currently-loaded listing
  // catalog, not the static PROPERTY_TYPES/EXPERIENCE_TAGS/DIETARY_OPTIONS
  // vocabularies (those stay in lib/types.ts purely for URL-param shape
  // validation; see applyUrlState below). Only values actually present on at
  // least one listing render as filter options.
  const availablePropertyTypes = useMemo(
    () =>
      [
        ...new Set(
          allListings
            .map((l) => l.propertyType)
            .filter((pt): pt is string => Boolean(pt)),
        ),
      ].sort(),
    [allListings],
  );
  const availableExperienceTags = useMemo(
    () =>
      [...new Set(allListings.flatMap((l) => l.experienceTags ?? []).filter(Boolean))].sort(),
    [allListings],
  );
  const availableDietaryOptions = useMemo(
    () =>
      [...new Set(allListings.flatMap((l) => l.dietaryOptions ?? []).filter(Boolean))].sort(),
    [allListings],
  );

  // 3 preset price buckets ("Under X" / "X – Y" / "Above Y") — X and Y are
  // terciles of the real min/max nightly rate in the current catalog,
  // rounded to the nearest ₹500. Not hardcoded; recomputes if the catalog
  // changes. Falls back to a placeholder pair before listings load.
  const priceBuckets = useMemo(() => {
    const rupeeRates = allListings
      .map((l) => (l.rateRules?.[0]?.baseNightlyRate ?? 0) / 100)
      .filter((rate) => rate > 0);
    const round500 = (n: number) => Math.round(n / 500) * 500;
    let low = 5000;
    let high = 10000;
    if (rupeeRates.length > 0) {
      const min = Math.min(...rupeeRates);
      const max = Math.max(...rupeeRates);
      if (max === min) {
        const mid = round500(max);
        low = Math.max(500, mid - 500);
        high = mid + 500;
      } else {
        const span = max - min;
        low = round500(min + span / 3);
        high = round500(min + (span * 2) / 3);
        if (high <= low) high = low + 500;
      }
    }
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    return [
      { label: `Under ${fmt(low)}`, min: '', max: String(low) },
      { label: `${fmt(low)} – ${fmt(high)}`, min: String(low), max: String(high) },
      { label: `Above ${fmt(high)}`, min: String(high), max: '' },
    ];
  }, [allListings]);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = search.trim().toLowerCase();

    if (query.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    const addSuggestion = (suggestion: SearchSuggestion) => {
      const key = `${suggestion.type}:${suggestion.value.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push(suggestion);
      }
    };

    allListings.forEach((listing) => {
      if (listing.title.toLowerCase().includes(query)) {
        addSuggestion({
          label: listing.title,
          value: listing.title,
          type: 'Stay',
          secondary: `${listing.city}, ${listing.state}`,
        });
      }
    });

    allListings.forEach((listing) => {
      if (listing.city.toLowerCase().includes(query)) {
        addSuggestion({
          label: listing.city,
          value: listing.city,
          type: 'City',
          secondary: listing.state,
        });
      }
    });

    allListings.forEach((listing) => {
      if (listing.state.toLowerCase().includes(query)) {
        addSuggestion({
          label: listing.state,
          value: listing.state,
          type: 'State',
          secondary: listing.country,
        });
      }
    });

    return suggestions.slice(0, 6);
  }, [allListings, search]);

  const selectSearchSuggestion = useCallback(
    (suggestion: SearchSuggestion) => {
      setSearch(suggestion.value);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    },
    [],
  );

  const handleSearchKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    const hasSuggestions = searchSuggestions.length > 0;
    const suggestionsOpen = showSuggestions && hasSuggestions;

    if (event.key === 'ArrowDown') {
      if (!hasSuggestions) return;

      event.preventDefault();
      setShowSuggestions(true);

      setActiveSuggestionIndex((current) =>
        current >= searchSuggestions.length - 1
          ? 0
          : current + 1,
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      if (!hasSuggestions) return;

      event.preventDefault();
      setShowSuggestions(true);

      setActiveSuggestionIndex((current) =>
        current <= 0
          ? searchSuggestions.length - 1
          : current - 1,
      );

      return;
    }

    if (
      event.key === 'Enter' &&
      suggestionsOpen &&
      activeSuggestionIndex >= 0
    ) {
      event.preventDefault();

      selectSearchSuggestion(
        searchSuggestions[activeSuggestionIndex],
      );

      return;
    }

    if (event.key === 'Escape' && showSuggestions) {
      event.preventDefault();
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  // Amenity vocabulary — only tags actually attached to at least one current
  // listing, not the full tag catalog (allTags is the full catalog; it stays
  // in use for tag-ID URL validation via validTagIds, a separate concern).
  const tagsByCategory = useMemo(() => {
    const seen = new Set<string>();
    const map: Record<string, Tag[]> = {};
    allListings.forEach((listing) => {
      listing.tags?.forEach((lt) => {
        if (seen.has(lt.tag.id)) return;
        seen.add(lt.tag.id);
        (map[lt.tag.category] ??= []).push(lt.tag);
      });
    });
    return map;
  }, [allListings]);

  // Initial load — `retryTick` lets the restyled error state's "Try again"
  // button re-run this exact same fetch; the request itself is unchanged.
  useEffect(() => {
    setLoading(true);
    setError('');
    listingsApi.getPublic()
      .then((listings) => {
        setAllListings(listings);
        setResults(listings);
        setMapListings(listings);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

    listingsApi.getTags()
      .then((tags) => {
        setAllTags(tags);
        setTagMetadataStatus('ready');
      })
      .catch(() => {
        setAllTags([]);
        setTagMetadataStatus('failed');
      });
  }, [retryTick]);

  useEffect(() => {
    if (tagMetadataStatus !== 'ready') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const normalizedTagState = normalizeDiscoveryTagUrlState(
      params,
      validTagIds,
    );

    pendingUrlTagCandidatesRef.current = normalizedTagState.tagIds;

    if (!arraysEqual(filterTags, normalizedTagState.tagIds)) {
      restoringUrlStateRef.current = true;
      setFilterTags(normalizedTagState.tagIds);
    }

    const canonicalQuery = normalizedTagState.canonicalParams.toString();
    const currentUrl =
      `${window.location.pathname}` +
      `${window.location.search}` +
      `${window.location.hash}`;
    const canonicalUrl =
      `${window.location.pathname}` +
      `${canonicalQuery ? `?${canonicalQuery}` : ''}` +
      `${window.location.hash}`;

    if (canonicalUrl !== currentUrl) {
      window.history.replaceState(
        window.history.state,
        '',
        canonicalUrl,
      );
    }
  }, [tagMetadataStatus, validTagIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasDiscoveryFacets = useMemo(
    () =>
      filterExperienceTags.length > 0 ||
      !!filterPropertyType ||
      filterDietary.length > 0 ||
      !!filterSort,
    [filterExperienceTags, filterPropertyType, filterDietary, filterSort],
  );

  // Apply client-side filters on top of search results
  const applyFilters = useCallback((base: Listing[]) => {
    let out = base;
    if (filterState) {
      out = out.filter((l) => l.state.toLowerCase() === filterState.toLowerCase());
    }
    if (filterGuests) {
      const g = parseInt(filterGuests, 10);
      out = out.filter((l) => (l.rateRules?.[0]?.maxGuests ?? 0) >= g);
    }
    if (filterMinPrice) {
      const minPaise = parseFloat(filterMinPrice) * 100;
      out = out.filter((l) => (l.rateRules?.[0]?.baseNightlyRate ?? 0) >= minPaise);
    }
    if (filterMaxPrice) {
      const maxPaise = parseFloat(filterMaxPrice) * 100;
      out = out.filter((l) => (l.rateRules?.[0]?.baseNightlyRate ?? Infinity) <= maxPaise);
    }
    if (filterTags.length > 0) {
      out = out.filter((l) =>
        filterTags.every((tagId) =>
          l.tags?.some((lt) => lt.tagId === tagId),
        ),
      );
    }
    return out;
  }, [filterState, filterGuests, filterMinPrice, filterMaxPrice, filterTags]);

  const handleMapBoundsChange = useCallback(
    async (bounds: LatLngBounds) => {
      mapAbortControllerRef.current?.abort();

      const controller = new AbortController();
      mapAbortControllerRef.current = controller;

      const requestId = ++mapRequestId.current;
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      setMapLoading(true);
      setMapError('');

      try {
        const listings = await listingsApi.getByBounds(
          southWest.lat,
          southWest.lng,
          northEast.lat,
          northEast.lng,
          controller.signal,
        );

        if (requestId === mapRequestId.current) {
          setMapListings(listings);
          setHasLoadedMapBounds(true);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (requestId === mapRequestId.current) {
          setMapError(
            error instanceof Error
              ? error.message
              : 'Unable to load listings for this map area.',
          );
          setHasLoadedMapBounds(true);
        }
      } finally {
        if (mapAbortControllerRef.current === controller) {
          mapAbortControllerRef.current = null;
        }

        if (requestId === mapRequestId.current) {
          setMapLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      mapAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      searchRequestId.current += 1;
    };
  }, []);

  // Search via API (Meilisearch with DB fallback) or facet-driven discovery
  const runSearch = useCallback(async (q: string) => {
    const requestId = ++searchRequestId.current;
    const useDiscovery = hasDiscoveryFacets || !!q.trim();
    if (!useDiscovery) {
      if (requestId === searchRequestId.current) {
        setResults(applyFilters(allListings));
        setSearching(false);
      }
      return;
    }
    setSearching(true);
    try {
      if (hasDiscoveryFacets) {
        const data = await listingsApi.getPublic({
          q: q.trim() || undefined,
          experienceTags: filterExperienceTags.length ? filterExperienceTags : undefined,
          propertyType: filterPropertyType || undefined,
          dietaryOptions: filterDietary.length ? filterDietary : undefined,
          sort: filterSort || undefined,
        });
        if (requestId === searchRequestId.current) {
          setResults(applyFilters(data));
        }
      } else {
        const data = await listingsApi.search(q);
        if (requestId === searchRequestId.current) {
          setResults(applyFilters(data));
        }
      }
    } catch {
      if (requestId !== searchRequestId.current) {
        return;
      }

      const lower = q.toLowerCase();
      setResults(
        applyFilters(allListings.filter(
          (l) =>
            l.title.toLowerCase().includes(lower) ||
            l.city.toLowerCase().includes(lower) ||
            l.state.toLowerCase().includes(lower) ||
            l.description.toLowerCase().includes(lower),
        )),
      );
    } finally {
      if (requestId === searchRequestId.current) {
        setSearching(false);
      }
    }
  }, [
    allListings,
    applyFilters,
    hasDiscoveryFacets,
    filterExperienceTags,
    filterPropertyType,
    filterDietary,
    filterSort,
  ]);

  useEffect(() => {
    void runSearch(debouncedSearch);
  }, [debouncedSearch, runSearch]);

  // Hero "Search" button — runs the exact existing search immediately
  // (bypassing the debounce) instead of waiting for it, then scrolls to the
  // results. Not a second search path: it calls the same runSearch used by
  // the effect above.
  const handleHeroSubmit = useCallback(() => {
    void runSearch(search);
    // Deferred to the next frame: calling scrollIntoView synchronously here
    // races with the same-tick setSearching(true) re-render this triggers
    // (which swaps the grid for SkeletonGrid) — Chromium silently drops the
    // scroll when it lands in the same tick as that reflow. rAF sidesteps it.
    window.requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [runSearch, search]);

  // Re-apply filters when filter values change without new search
  useEffect(() => {
    if (!debouncedSearch.trim() && !hasDiscoveryFacets) {
      setResults(applyFilters(allListings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, filterGuests, filterMinPrice, filterMaxPrice, filterTags, allListings, hasDiscoveryFacets]);

  const clearFilters = () => {
    pendingUrlTagCandidatesRef.current = [];
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterGuests('');
    setFilterState('');
    setFilterTags([]);
    setFilterExperienceTags([]);
    setFilterPropertyType('');
    setFilterDietary([]);
    setFilterSort('');
  };

  const toggleTag = (tagId: string) => {
    pendingUrlTagCandidatesRef.current = [];
    setFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const toggleExperience = (tag: string) => {
    setFilterExperienceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleDietary = (option: string) => {
    setFilterDietary((prev) =>
      prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option],
    );
  };

  const formatFacet = (s: string) =>
    s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const suggestionsRendered =
    showSuggestions && searchSuggestions.length > 0;

  const activeSuggestionId =
    suggestionsRendered &&
    activeSuggestionIndex >= 0 &&
    activeSuggestionIndex < searchSuggestions.length
      ? `search-suggestion-${activeSuggestionIndex}`
      : undefined;

  const resultsStatusText =
    loading
      ? 'Loading stays.'
      : searching
        ? 'Searching stays.'
        : `${results.length} curated ${results.length === 1 ? 'stay' : 'stays'}.`;

  const visibleResultsStatusText =
    loading || searching
      ? 'Searching...'
      : `${results.length} curated ${results.length === 1 ? 'stay' : 'stays'}`;

  const discoveryFocusRingClassName =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/30 focus-visible:ring-offset-2';
  const mapViewDescriptionId = 'discovery-map-description';
  const splitMapDescriptionId = 'discovery-split-map-description';
  const mapListingsSummary = `${visibleMapListings.length} curated ${visibleMapListings.length === 1 ? 'stay' : 'stays'}`;
  const mapViewDescription = `Map showing ${visibleMapListings.length} ${visibleMapListings.length === 1 ? 'stay' : 'stays'} in the current area. Use Tab to move through markers and Enter to open a marker.`;

  return (
    <>
      <ExploreHero
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setShowSuggestions(true);
          setActiveSuggestionIndex(-1);
        }}
        onSearchFocus={() => {
          setShowSuggestions(true);
          setActiveSuggestionIndex(-1);
        }}
        searchBoxRef={searchBoxRef}
        searching={searching}
        searchSuggestions={searchSuggestions}
        suggestionsRendered={suggestionsRendered}
        activeSuggestionIndex={activeSuggestionIndex}
        activeSuggestionId={activeSuggestionId}
        onSuggestionHover={setActiveSuggestionIndex}
        onSuggestionSelect={selectSearchSuggestion}
        onSearchKeyDown={handleSearchKeyDown}
        onSubmit={handleHeroSubmit}
        stayCount={allListings.length}
        featuredListings={allListings}
      />

      {/* Listings — shares EXPLORE_CONTAINER_CLASS with ExploreHero above, so
          the hero and the listing grid always line up at the same left/right
          edges by construction, not by two independently-tuned values that
          could drift apart. Deliberately narrower than the site-wide
          `container-page` (max-w-7xl) used elsewhere in the app — scoped to
          just the Explore page, which keeps every other page's shared
          container untouched. */}
      <section ref={resultsSectionRef} className={`${EXPLORE_CONTAINER_CLASS} py-12`}>
        <ExploreHeader
          search={search}
          visibleResultsText={visibleResultsStatusText}
          srResultsText={resultsStatusText}
          showClearAll={!!(search || activeFilterCount > 0)}
          onClearAll={() => { setSearch(''); clearFilters(); }}
          focusRingClassName={discoveryFocusRingClassName}
        />

        <div className="min-w-0">
          <StayToolbar
            filterSort={filterSort}
            setFilterSort={setFilterSort}
            viewMode={viewMode}
            setViewMode={setViewMode}
            activeFilterCount={activeFilterCount}
            onOpenFilters={() => setFiltersOpen(true)}
            focusRingClassName={discoveryFocusRingClassName}
          />

            <ActiveFilterChips
              filterState={filterState}
              setFilterState={setFilterState}
              filterGuests={filterGuests}
              setFilterGuests={setFilterGuests}
              filterMinPrice={filterMinPrice}
              setFilterMinPrice={setFilterMinPrice}
              filterMaxPrice={filterMaxPrice}
              setFilterMaxPrice={setFilterMaxPrice}
              filterPropertyType={filterPropertyType}
              setFilterPropertyType={setFilterPropertyType}
              filterSort={filterSort}
              setFilterSort={setFilterSort}
              filterExperienceTags={filterExperienceTags}
              toggleExperience={toggleExperience}
              filterDietary={filterDietary}
              toggleDietary={toggleDietary}
              filterTags={filterTags}
              toggleTag={toggleTag}
              allTags={allTags}
              formatFacet={formatFacet}
            />

            {error && (
              <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />
            )}

            {(loading || searching) && !error && <SkeletonGrid />}

            {!loading && !searching && !error && results.length === 0 && (
              <EmptyState
                hasActiveSearchOrFilters={!!(search || activeFilterCount > 0)}
                onClearAll={() => { setSearch(''); clearFilters(); }}
              />
            )}

            {!loading && !searching && !error && results.length > 0 && (
              <>
                {/* Grid view — paginated client-side (see RESULTS_PAGE_SIZE);
                    map/split below intentionally keep using the full,
                    unpaginated `results`/`visibleMapListings`. */}
                {viewMode === 'grid' && (
                  <>
                    <StayEditorialGrid listings={paginatedResults} />
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      focusRingClassName={discoveryFocusRingClassName}
                    />
                  </>
                )}

                {/* Map view */}
                {viewMode === 'map' && (
                  <div
                    className="relative rounded-3xl overflow-hidden"
                    role="region"
                    aria-label="Map of available stays"
                    aria-busy={mapLoading}
                    aria-describedby={mapViewDescriptionId}
                  >
                    <p id={mapViewDescriptionId} className="sr-only">
                      {mapViewDescription}
                    </p>
                    <ListingMap
                      listings={visibleMapListings}
                      height="clamp(380px, 65vh, 600px)"
                      selectedId={selectedListingId}
                      onListingSelect={handleListingSelect}
                      onBoundsChange={handleMapBoundsChange}
                    />

                    <MapStatusOverlay
                      loading={mapLoading}
                      error={mapError}
                      empty={showMapEmptyState}
                    />
                  </div>
                )}

                {/* Split view */}
                {viewMode === 'split' && (
                  <div className="flex flex-col gap-6 lg:min-h-[600px] lg:flex-row">
                    <div
                      className="relative w-full lg:w-1/2 lg:flex-shrink-0 rounded-3xl overflow-hidden"
                      role="region"
                      aria-label="Map of available stays"
                      aria-busy={mapLoading}
                      aria-describedby={splitMapDescriptionId}
                    >
                      <p id={splitMapDescriptionId} className="sr-only">
                        {mapViewDescription}
                      </p>
                      <ListingMap
                        listings={visibleMapListings}
                        height="clamp(380px, 65vh, 600px)"
                        selectedId={hoveredId ?? selectedListingId}
                        onListingSelect={handleListingSelect}
                        onBoundsChange={handleMapBoundsChange}
                      />

                      <MapStatusOverlay
                        loading={mapLoading}
                        error={mapError}
                        empty={showMapEmptyState}
                        announceState={false}
                      />
                    </div>
                    <div
                      className="w-full lg:max-h-[600px] lg:w-1/2 lg:overflow-y-auto lg:pr-1"
                      role="region"
                      aria-label="Stays in the current map area"
                      aria-busy={mapLoading}
                    >
                      {mapLoading && visibleMapListings.length === 0 ? (
                        <div className="flex min-h-[360px] lg:min-h-[600px] items-center justify-center rounded-3xl border border-gray-200 bg-white px-6 text-center">
                          <div>
                            <span className="spinner mb-3 h-5 w-5 text-brand-700" />
                            <p className="text-sm font-medium text-gray-700">
                              Searching this map area...
                            </p>
                          </div>
                        </div>
                      ) : mapError && visibleMapListings.length === 0 ? (
                        <div
                          className="flex min-h-[360px] lg:min-h-[600px] items-center justify-center rounded-3xl border border-red-200 bg-white px-6 text-center"
                          role="alert"
                        >
                          <div>
                            <div className="mb-3 text-3xl">⚠️</div>
                            <p className="font-medium text-gray-900">
                              Unable to load stays
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              Move the map or try again shortly.
                            </p>
                          </div>
                        </div>
                      ) : visibleMapListings.length === 0 ? (
                        <div
                          className="flex min-h-[360px] lg:min-h-[600px] items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white px-6 text-center"
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          <div>
                            <div className="mb-3 text-4xl">🗺️</div>
                            <p className="font-medium text-gray-900">
                              No stays in this area
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              Move or zoom the map to explore another location.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4" aria-label={mapListingsSummary}>
                          {visibleMapListings.map((listing) => {
                            const isSelected = selectedListingId === listing.id;

                            return (
                              <div
                                key={listing.id}
                                ref={(element) => {
                                  listingCardRefs.current[listing.id] = element;
                                }}
                                onMouseEnter={() => setHoveredId(listing.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                className={`scroll-m-3 rounded-3xl transition-shadow ${
                                  isSelected
                                    ? 'ring-2 ring-brand-700 ring-offset-2'
                                    : ''
                                }`}
                              >
                                <ListingCard listing={listing} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </section>

      <FilterPanel
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        resultCount={results.length}
        priceBuckets={priceBuckets}
        uniqueStates={uniqueStates}
        filterState={filterState}
        setFilterState={setFilterState}
        filterGuests={filterGuests}
        setFilterGuests={setFilterGuests}
        filterMinPrice={filterMinPrice}
        setFilterMinPrice={setFilterMinPrice}
        filterMaxPrice={filterMaxPrice}
        setFilterMaxPrice={setFilterMaxPrice}
        filterPropertyType={filterPropertyType}
        setFilterPropertyType={setFilterPropertyType}
        availablePropertyTypes={availablePropertyTypes}
        filterExperienceTags={filterExperienceTags}
        toggleExperience={toggleExperience}
        availableExperienceTags={availableExperienceTags}
        filterDietary={filterDietary}
        toggleDietary={toggleDietary}
        availableDietaryOptions={availableDietaryOptions}
        filterTags={filterTags}
        toggleTag={toggleTag}
        tagsByCategory={tagsByCategory}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        formatFacet={formatFacet}
        focusRingClassName={discoveryFocusRingClassName}
      />
      {/* Features section */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Why Dhyana Stays?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🌿',
                title: 'Curated by experts',
                desc: 'Every property is personally vetted by our wellness curators for authenticity and quality.',
              },
              {
                icon: '🔒',
                title: 'Secure bookings',
                desc: 'Razorpay-powered payments with full/deposit options and transparent refund policies.',
              },
              {
                icon: '🤝',
                title: 'Host community',
                desc: 'Join our network of conscious hosts and earn with weekly payouts and full transparency.',
              },
            ].map((f) => (
              <div key={f.title} className="text-center p-6">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
