import type { DiscoverySort } from './types';

export type DiscoveryViewMode = 'grid' | 'map' | 'split';

type DiscoveryUrlStateOptions = {
  validExperienceTags: readonly string[];
  validPropertyTypes: readonly string[];
  validDietaryOptions: readonly string[];
  validSorts?: readonly DiscoverySort[];
};

export type NormalizedDiscoveryUrlState = {
  q: string;
  state: string;
  guests: string;
  maxPrice: string;
  experiences: string[];
  propertyType: string;
  dietary: string[];
  sort: DiscoverySort | '';
  view: DiscoveryViewMode;
  canonicalParams: URLSearchParams;
};

export type NormalizedDiscoveryTagUrlState = {
  tagIds: string[];
  canonicalParams: URLSearchParams;
};

const DEFAULT_VALID_SORTS: readonly DiscoverySort[] = [
  'newest',
  'price-asc',
  'price-desc',
];

function normalizeTrimmedText(value: string | null): string {
  return value?.trim() ?? '';
}

function normalizeCanonicalInteger(
  value: string | null,
  {
    min,
    max,
  }: {
    min: number;
    max?: number;
  },
): string {
  const trimmed = value?.trim() ?? '';

  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return '';
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed < min) {
    return '';
  }

  if (typeof max === 'number' && parsed > max) {
    return '';
  }

  return String(parsed);
}

function normalizeEnum<T extends string>(
  value: string | null,
  validValues: ReadonlySet<T>,
): T | '' {
  const trimmed = value?.trim() ?? '';

  if (!trimmed || !validValues.has(trimmed as T)) {
    return '';
  }

  return trimmed as T;
}

function normalizeFixedList(
  value: string | null,
  validValues: ReadonlySet<string>,
): string[] {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];

  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (!validValues.has(item) || seen.has(item)) {
        return;
      }

      seen.add(item);
      out.push(item);
    });

  return out;
}

function setSingleParam(
  params: URLSearchParams,
  key: string,
  value: string,
): void {
  params.delete(key);

  if (value) {
    params.set(key, value);
  }
}

export function parseDiscoveryTagCandidates(
  inputParams: URLSearchParams,
): string[] {
  const tagsValue = inputParams.get('tags');

  if (!tagsValue) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];

  tagsValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (seen.has(item)) {
        return;
      }

      seen.add(item);
      out.push(item);
    });

  return out;
}

export function normalizeDiscoveryTagUrlState(
  inputParams: URLSearchParams,
  validTagIds: readonly string[],
): NormalizedDiscoveryTagUrlState {
  const canonicalParams = new URLSearchParams(inputParams);
  const validTagIdSet = new Set(validTagIds);
  const tagIds = parseDiscoveryTagCandidates(inputParams).filter((tagId) =>
    validTagIdSet.has(tagId),
  );

  canonicalParams.delete('tags');

  if (tagIds.length > 0) {
    canonicalParams.set('tags', tagIds.join(','));
  }

  return {
    tagIds,
    canonicalParams,
  };
}

export function normalizeDiscoveryUrlState(
  inputParams: URLSearchParams,
  {
    validExperienceTags,
    validPropertyTypes,
    validDietaryOptions,
    validSorts = DEFAULT_VALID_SORTS,
  }: DiscoveryUrlStateOptions,
): NormalizedDiscoveryUrlState {
  const canonicalParams = new URLSearchParams(inputParams);
  const experienceSet = new Set(validExperienceTags);
  const propertyTypeSet = new Set(validPropertyTypes);
  const dietarySet = new Set(validDietaryOptions);
  const sortSet = new Set(validSorts);

  const q = normalizeTrimmedText(inputParams.get('q'));
  const state = normalizeTrimmedText(inputParams.get('state'));
  const guests = normalizeCanonicalInteger(inputParams.get('guests'), {
    min: 1,
    max: 20,
  });
  const maxPrice = normalizeCanonicalInteger(inputParams.get('maxPrice'), {
    min: 0,
  });
  const propertyType = normalizeEnum(
    inputParams.get('propertyType'),
    propertyTypeSet,
  );
  const sort = normalizeEnum(
    inputParams.get('sort'),
    sortSet,
  ) as DiscoverySort | '';
  const experiences = normalizeFixedList(
    inputParams.get('experiences'),
    experienceSet,
  );
  const dietary = normalizeFixedList(
    inputParams.get('dietary'),
    dietarySet,
  );

  const rawView = normalizeTrimmedText(inputParams.get('view'));
  const view: DiscoveryViewMode =
    rawView === 'map' || rawView === 'split' || rawView === 'grid'
      ? rawView
      : 'grid';

  setSingleParam(canonicalParams, 'q', q);
  setSingleParam(canonicalParams, 'state', state);
  setSingleParam(canonicalParams, 'guests', guests);
  setSingleParam(canonicalParams, 'maxPrice', maxPrice);
  setSingleParam(canonicalParams, 'propertyType', propertyType);
  setSingleParam(canonicalParams, 'sort', sort);
  setSingleParam(
    canonicalParams,
    'experiences',
    experiences.join(','),
  );
  setSingleParam(canonicalParams, 'dietary', dietary.join(','));

  canonicalParams.delete('view');
  if (view !== 'grid') {
    canonicalParams.set('view', view);
  }

  return {
    q,
    state,
    guests,
    maxPrice,
    experiences,
    propertyType,
    dietary,
    sort,
    view,
    canonicalParams,
  };
}
