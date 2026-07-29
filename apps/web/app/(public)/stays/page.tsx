"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Map as MapIcon,
  ChevronDown,
  X,
  MapPin,
  Home,
  Users,
  Sparkles,
  Check,
} from "lucide-react";
import {
  getListingFacets,
  getPublicListings,
  type ListingFacets,
} from "@/lib/api";
import type { Property } from "@/lib/types";
import PropertyCard from "@/app/components/PropertyCard";

type PriceBucket = "any" | "under-5k" | "5k-10k" | "10k-20k" | "above-20k";
type SortKey = "recommended" | "price-low" | "price-high" | "rating";

const priceBuckets: { key: PriceBucket; label: string; test: (price: number) => boolean }[] = [
  { key: "any", label: "Any price", test: () => true },
  { key: "under-5k", label: "Under ₹5,000", test: (p) => p < 5000 },
  { key: "5k-10k", label: "₹5,000 – ₹10,000", test: (p) => p >= 5000 && p <= 10000 },
  { key: "10k-20k", label: "₹10,000 – ₹20,000", test: (p) => p > 10000 && p <= 20000 },
  { key: "above-20k", label: "Above ₹20,000", test: (p) => p > 20000 },
];


export default function StaysDiscoveryPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filterCatalog, setFilterCatalog] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showMap, setShowMap] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [sortOpen, setSortOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceBucket, setPriceBucket] = useState<PriceBucket>("any");
  const [minGuests, setMinGuests] = useState(1);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedExperienceTags, setSelectedExperienceTags] = useState<string[]>([]);
  const [selectedDietaryOptions, setSelectedDietaryOptions] = useState<string[]>([]);
  const [facetOptions, setFacetOptions] = useState<ListingFacets>({
    experienceTags: [],
    propertyTypes: [],
    dietaryOptions: [],
  });

  const backendSort =
    sortBy === "price-low"
      ? "price-asc"
      : sortBy === "price-high"
        ? "price-desc"
        : undefined;

  const backendPriceRange =
    priceBucket === "under-5k"
      ? { maxPrice: 4999 }
      : priceBucket === "5k-10k"
        ? { minPrice: 5000, maxPrice: 10000 }
        : priceBucket === "10k-20k"
          ? { minPrice: 10001, maxPrice: 20000 }
          : priceBucket === "above-20k"
            ? { minPrice: 20001 }
            : {};

  useEffect(() => {
    const controller = new AbortController();

    async function loadFacets() {
      try {
        const facets = await getListingFacets(controller.signal);
        setFacetOptions(facets);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Unable to load listing filters:", error);
      }
    }

    void loadFacets();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        setLoading(true);
        setLoadError(null);

        const listings = await getPublicListings(
          {
            q: debouncedSearch || undefined,
            cities:
              selectedDestinations.length > 0
                ? selectedDestinations
                : undefined,
            propertyTypes:
              selectedTypes.length > 0
                ? selectedTypes
                : undefined,
            experienceTags:
              selectedExperienceTags.length > 0
                ? selectedExperienceTags
                : undefined,
            dietaryOptions:
              selectedDietaryOptions.length > 0
                ? selectedDietaryOptions
                : undefined,
            ...backendPriceRange,
            minGuests: minGuests > 1 ? minGuests : undefined,
            sort: backendSort,
          },
          controller.signal,
        );

        setProperties(listings);

        if (
          !debouncedSearch &&
          selectedDestinations.length === 0 &&
          selectedTypes.length === 0 &&
          selectedExperienceTags.length === 0 &&
          selectedDietaryOptions.length === 0 &&
          priceBucket === "any" &&
          minGuests === 1
        ) {
          setFilterCatalog(listings);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load stays at the moment.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadListings();

    return () => controller.abort();
  }, [
    debouncedSearch,
    backendSort,
    selectedDestinations,
    selectedTypes,
    selectedExperienceTags,
    selectedDietaryOptions,
    priceBucket,
    minGuests,
  ]);

  const optionProperties =
    filterCatalog.length > 0 ? filterCatalog : properties;

  const categories = useMemo(
    () =>
      Array.from(new Set(optionProperties.map((property) => property.category)))
        .filter(Boolean)
        .sort()
        .map((name) => ({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        })),
    [optionProperties],
  );

  const destinationOptions = useMemo(
    () =>
      Array.from(
        new Set(optionProperties.map((property) => property.location.city)),
      )
        .filter(Boolean)
        .sort(),
    [optionProperties],
  );

  const typeOptions = useMemo(() => {
    if (facetOptions.propertyTypes.length > 0) {
      return facetOptions.propertyTypes;
    }

    return Array.from(
      new Set(optionProperties.map((property) => property.category)),
    )
      .filter(Boolean)
      .sort();
  }, [facetOptions.propertyTypes, optionProperties]);

  const experienceTagOptions = facetOptions.experienceTags;
  const dietaryOptionOptions = facetOptions.dietaryOptions;

  const toggleDestination = (d: string) =>
    setSelectedDestinations((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const toggleType = (t: string) =>
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleExperienceTag = (tag: string) =>
    setSelectedExperienceTags((previous) =>
      previous.includes(tag)
        ? previous.filter((value) => value !== tag)
        : [...previous, tag],
    );

  const toggleDietaryOption = (option: string) =>
    setSelectedDietaryOptions((previous) =>
      previous.includes(option)
        ? previous.filter((value) => value !== option)
        : [...previous, option],
    );

  const clearFilters = () => {
    setPriceBucket("any");
    setMinGuests(1);
    setSelectedDestinations([]);
    setSelectedTypes([]);
    setSelectedExperienceTags([]);
    setSelectedDietaryOptions([]);
  };

  const activeFilterCount =
    (priceBucket !== "any" ? 1 : 0) +
    (minGuests > 1 ? 1 : 0) +
    selectedDestinations.length +
    selectedTypes.length +
    selectedExperienceTags.length +
    selectedDietaryOptions.length;

  const activeCategoryName = categories.find((c) => c.slug === activeCategory)?.name;
  const priceTest = priceBuckets.find((b) => b.key === priceBucket)!.test;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = properties.filter((p) => {
      const matchesCategory =
        activeCategory === "all" ||
        (activeCategoryName &&
          activeCategoryName.toLowerCase() === p.category.toLowerCase());
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q) ||
        p.location.state.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q);
      const matchesPrice = priceTest(p.price);
      const matchesGuests = p.maxGuests >= minGuests;
      const matchesDestination = selectedDestinations.length === 0 || selectedDestinations.includes(p.location.city);
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(p.category);
      return (
        matchesCategory &&
        matchesSearch &&
        matchesPrice &&
        matchesGuests &&
        matchesDestination &&
        matchesType
      );
    });

    if (sortBy === "rating") {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [
    properties,
    search,
    activeCategory,
    activeCategoryName,
    priceTest,
    minGuests,
    selectedDestinations,
    selectedTypes,
    sortBy,
  ]);

  const sortLabels: Record<SortKey, string> = {
    recommended: "Recommended",
    "price-low": "Price: Low to High",
    "price-high": "Price: High to Low",
    rating: "Top Rated",
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Search & Filter Header */}
      <div className="sticky top-[72px] z-40 bg-background border-b border-border py-5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-auto md:flex-1 max-w-xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by destination, property name, or theme..."
                className="w-full pl-11 pr-4 py-3 bg-surface rounded-full text-sm text-foreground placeholder-muted shadow-organic focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setFiltersOpen(true)}
                className={`relative flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all ${
                  activeFilterCount > 0
                    ? "bg-primary text-primary-foreground shadow-organic"
                    : "bg-surface text-foreground shadow-organic hover:-translate-y-0.5"
                }`}
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white/25 text-[11px] font-bold flex items-center justify-center tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all ${
                  showMap
                    ? "bg-primary text-primary-foreground shadow-organic"
                    : "bg-surface text-foreground shadow-organic hover:-translate-y-0.5"
                }`}
              >
                <MapIcon size={16} />
                {showMap ? "Hide Map" : "Show Map"}
              </button>
            </div>
          </div>

          {/* Categories Carousel */}
          <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border text-muted hover:text-foreground"
              }`}
            >
              All Stays
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                  activeCategory === cat.slug
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface border-border text-muted hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Results Grid */}
          <div className={`flex-1 transition-all ${showMap ? "lg:w-3/5" : "w-full"}`}>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="heading-organic text-xl text-foreground">
                {loading
                  ? "Loading curated stays..."
                  : loadError
                    ? "Unable to load stays"
                    : `${filtered.length} curated ${filtered.length === 1 ? "stay" : "stays"} found`}
              </h1>
              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm text-foreground font-medium hover:text-primary"
                >
                  Sort by: {sortLabels[sortBy]} <ChevronDown size={14} className={sortOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-surface shadow-organic p-1.5 z-20 animate-fade-in">
                    {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                          sortBy === key ? "bg-primary/10 text-primary font-medium" : "text-muted hover:bg-surface-hover hover:text-foreground"
                        }`}
                      >
                        {sortLabels[key]}
                        {sortBy === key && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {selectedDestinations.map((d) => (
                  <FilterChip key={d} label={d} onClear={() => toggleDestination(d)} />
                ))}
                {selectedTypes.map((t) => (
                  <FilterChip key={t} label={t} onClear={() => toggleType(t)} />
                ))}
                {selectedExperienceTags.map((tag) => (
                  <FilterChip
                    key={`experience-${tag}`}
                    label={tag}
                    onClear={() => toggleExperienceTag(tag)}
                  />
                ))}
                {selectedDietaryOptions.map((option) => (
                  <FilterChip
                    key={`dietary-${option}`}
                    label={option}
                    onClear={() => toggleDietaryOption(option)}
                  />
                ))}
                {priceBucket !== "any" && (
                  <FilterChip label={priceBuckets.find((b) => b.key === priceBucket)!.label} onClear={() => setPriceBucket("any")} />
                )}
                {minGuests > 1 && <FilterChip label={`${minGuests}+ guests`} onClear={() => setMinGuests(1)} />}
                <button onClick={clearFilters} className="text-xs text-primary hover:underline ml-1">
                  Clear all
                </button>
              </div>
            )}

            {filtered.length > 0 ? (
              <div
                className={`grid gap-6 ${
                  showMap
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                }`}
              >
                {filtered.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Sparkles size={28} className="text-subtle mx-auto mb-3" />
                <p className="text-sm text-subtle">No stays match your filters yet.</p>
                <button onClick={clearFilters} className="text-sm text-primary hover:underline mt-2">
                  Clear filters
                </button>
              </div>
            )}

            {/* Pagination Placeholder */}
            {filtered.length > 0 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface text-muted shadow-organic hover:text-foreground transition-colors disabled:opacity-50">
                    {"<"}
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold shadow-organic">
                    1
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface text-muted shadow-organic hover:text-foreground transition-colors">
                    2
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface text-muted shadow-organic hover:text-foreground transition-colors">
                    3
                  </button>
                  <span className="text-subtle">...</span>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full bg-surface text-muted shadow-organic hover:text-foreground transition-colors">
                    {">"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Map View */}
          {showMap && (
            <div className="hidden lg:block lg:w-2/5 animate-fade-in-up">
              <div className="sticky top-[160px] h-[calc(100vh-180px)] rounded-[28px] overflow-hidden bg-surface shadow-organic flex items-center justify-center">
                <div className="text-center p-8">
                  <span className="w-16 h-16 rounded-full bg-sage/12 text-sage flex items-center justify-center mx-auto mb-4">
                    <MapIcon size={26} />
                  </span>
                  <h3 className="text-lg font-medium text-foreground mb-2">Interactive Map</h3>
                  <p className="text-sm text-muted">
                    Map integration (Google Maps / Mapbox) placeholder.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= FILTERS DRAWER ================= */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setFiltersOpen(false)}>
          <aside
            className="absolute inset-y-0 right-0 w-full sm:w-[400px] bg-background shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
              <p className="text-sm font-semibold text-foreground">Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</p>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
              {/* Destination */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3 flex items-center gap-1.5">
                  <MapPin size={12} /> Destination
                </p>
                <div className="flex flex-wrap gap-2">
                  {destinationOptions.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDestination(d)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                        selectedDestinations.includes(d) ? "bg-sage text-white border-sage" : "bg-surface border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3 flex items-center gap-1.5">
                  <Home size={12} /> Property Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                        selectedTypes.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience tags */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
                  Experiences
                </p>
                <div className="flex flex-wrap gap-2">
                  {experienceTagOptions.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleExperienceTag(tag)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                        selectedExperienceTags.includes(tag)
                          ? "bg-sage text-white border-sage"
                          : "bg-surface border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary options */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">
                  Dietary options
                </p>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptionOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => toggleDietaryOption(option)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                        selectedDietaryOptions.includes(option)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-surface border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">Price per night</p>
                <div className="flex flex-wrap gap-2">
                  {priceBuckets.map((b) => (
                    <button
                      key={b.key}
                      onClick={() => setPriceBucket(b.key)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-colors ${
                        priceBucket === b.key ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-3">Guests</p>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-surface">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <Users size={15} className="text-subtle" /> {minGuests === 1 ? "Any" : `${minGuests}+ guests`}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMinGuests((g) => Math.max(1, g - 1))}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors"
                    >
                      -
                    </button>
                    <span className="w-4 text-center text-sm tabular-nums text-foreground">{minGuests}</span>
                    <button
                      onClick={() => setMinGuests((g) => Math.min(12, g + 1))}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-border bg-surface flex items-center gap-3">
              <button onClick={clearFilters} className="flex-1 py-3 text-sm font-medium text-muted hover:text-foreground border border-border rounded-full transition-colors">
                Clear all
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors"
              >
                Show {filtered.length} stays
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-surface shadow-organic text-xs text-foreground">
      {label}
      <button onClick={onClear} aria-label={`Remove ${label} filter`} className="p-0.5 rounded-full hover:bg-surface-hover text-subtle hover:text-foreground transition-colors">
        <X size={11} />
      </button>
    </span>
  );
}
