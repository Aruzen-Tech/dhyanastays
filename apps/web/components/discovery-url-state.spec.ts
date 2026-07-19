import { describe, expect, it } from 'vitest';
import { normalizeDiscoveryUrlState } from '../lib/discovery-url-state';
import {
  DIETARY_OPTIONS,
  EXPERIENCE_TAGS,
  PROPERTY_TYPES,
} from '../lib/types';

function normalize(query: string) {
  const params = new URLSearchParams(query);

  return normalizeDiscoveryUrlState(params, {
    validExperienceTags: EXPERIENCE_TAGS,
    validPropertyTypes: PROPERTY_TYPES,
    validDietaryOptions: DIETARY_OPTIONS,
  });
}

describe('normalizeDiscoveryUrlState', () => {
  it('treats missing and empty guests as no filter', () => {
    expect(normalize('').guests).toBe('');
    expect(normalize('guests=').guests).toBe('');
    expect(normalize('guests=   ').guests).toBe('');
  });

  it('accepts and canonicalizes valid guests values', () => {
    expect(normalize('guests=4').guests).toBe('4');
    expect(normalize('guests=04').canonicalParams.get('guests')).toBe('4');
  });

  it('rejects invalid guests values and removes them', () => {
    const invalidQueries = [
      'guests=0',
      'guests=-1',
      'guests=1.5',
      'guests=abc',
      'guests=NaN',
      'guests=Infinity',
      'guests=21',
      `guests=${Number.MAX_SAFE_INTEGER + 1}`,
    ];

    invalidQueries.forEach((query) => {
      const normalized = normalize(query);

      expect(normalized.guests).toBe('');
      expect(normalized.canonicalParams.has('guests')).toBe(false);
    });
  });

  it('accepts and canonicalizes maxPrice values in rupees', () => {
    expect(normalize('maxPrice=0').maxPrice).toBe('0');
    expect(normalize('maxPrice=5000').maxPrice).toBe('5000');
    expect(normalize('maxPrice=00500').canonicalParams.get('maxPrice')).toBe(
      '500',
    );
  });

  it('rejects invalid maxPrice values and removes them', () => {
    const invalidQueries = [
      'maxPrice=-1',
      'maxPrice=1.5',
      'maxPrice=abc',
      'maxPrice=NaN',
      'maxPrice=Infinity',
      `maxPrice=${Number.MAX_SAFE_INTEGER + 1}`,
    ];

    invalidQueries.forEach((query) => {
      const normalized = normalize(query);

      expect(normalized.maxPrice).toBe('');
      expect(normalized.canonicalParams.has('maxPrice')).toBe(false);
    });
  });

  it('trims q and state while preserving unicode and internal spaces', () => {
    const normalized = normalize(
      'q=%20%20mindful%20journey%20%20&state=%20%20T%C3%A4mil%20Nadu%20%20',
    );

    expect(normalized.q).toBe('mindful journey');
    expect(normalized.state).toBe('Tämil Nadu');
    expect(normalized.canonicalParams.get('q')).toBe('mindful journey');
    expect(normalized.canonicalParams.get('state')).toBe('Tämil Nadu');
  });

  it('removes empty q and state values', () => {
    const normalized = normalize('q=%20%20%20&state=');

    expect(normalized.q).toBe('');
    expect(normalized.state).toBe('');
    expect(normalized.canonicalParams.has('q')).toBe(false);
    expect(normalized.canonicalParams.has('state')).toBe(false);
  });

  it('preserves valid enums and removes invalid ones', () => {
    const valid = normalize(
      'view=split&sort=price-desc&propertyType=ashram',
    );

    expect(valid.view).toBe('split');
    expect(valid.sort).toBe('price-desc');
    expect(valid.propertyType).toBe('ashram');

    const invalid = normalize(
      'view=%20unknown%20&sort=invalid&propertyType= cabin ',
    );

    expect(invalid.view).toBe('grid');
    expect(invalid.sort).toBe('');
    expect(invalid.propertyType).toBe('');
    expect(invalid.canonicalParams.has('view')).toBe(false);
    expect(invalid.canonicalParams.has('sort')).toBe(false);
    expect(invalid.canonicalParams.has('propertyType')).toBe(false);
  });

  it('omits the default grid view from the canonical URL', () => {
    const normalized = normalize('view=grid');

    expect(normalized.view).toBe('grid');
    expect(normalized.canonicalParams.has('view')).toBe(false);
  });

  it('normalizes fixed lists by trimming, validating, deduplicating, and preserving order', () => {
    const normalized = normalize(
      'experiences=%20spa,invalid,spa,%20yoga,,nature%20&dietary=vegan,%20jain,vegan,invalid',
    );

    expect(normalized.experiences).toEqual(['spa', 'yoga', 'nature']);
    expect(normalized.dietary).toEqual(['vegan', 'jain']);
    expect(normalized.canonicalParams.get('experiences')).toBe(
      'spa,yoga,nature',
    );
    expect(normalized.canonicalParams.get('dietary')).toBe('vegan,jain');
  });

  it('removes fixed-list parameters when no valid entries remain', () => {
    const normalized = normalize(
      'experiences=invalid,%20%20&dietary=%20,unknown',
    );

    expect(normalized.experiences).toEqual([]);
    expect(normalized.dietary).toEqual([]);
    expect(normalized.canonicalParams.has('experiences')).toBe(false);
    expect(normalized.canonicalParams.has('dietary')).toBe(false);
  });

  it('keeps the first known repeated parameter and canonicalizes to one occurrence', () => {
    const normalized = normalize(
      'q=first&q=second&state=Kerala&state=Goa&guests=04&guests=9&maxPrice=0500&maxPrice=900&view=map&view=split&sort=price-asc&sort=newest&propertyType=ashram&propertyType=villa&experiences=spa,spa,yoga&experiences=nature&dietary=vegan,vegan&dietary=jain',
    );

    expect(normalized.q).toBe('first');
    expect(normalized.state).toBe('Kerala');
    expect(normalized.guests).toBe('4');
    expect(normalized.maxPrice).toBe('500');
    expect(normalized.view).toBe('map');
    expect(normalized.sort).toBe('price-asc');
    expect(normalized.propertyType).toBe('ashram');
    expect(normalized.experiences).toEqual(['spa', 'yoga']);
    expect(normalized.dietary).toEqual(['vegan']);

    expect(normalized.canonicalParams.getAll('q')).toEqual(['first']);
    expect(normalized.canonicalParams.getAll('state')).toEqual(['Kerala']);
    expect(normalized.canonicalParams.getAll('guests')).toEqual(['4']);
    expect(normalized.canonicalParams.getAll('maxPrice')).toEqual(['500']);
    expect(normalized.canonicalParams.getAll('view')).toEqual(['map']);
    expect(normalized.canonicalParams.getAll('sort')).toEqual(['price-asc']);
    expect(normalized.canonicalParams.getAll('propertyType')).toEqual([
      'ashram',
    ]);
    expect(normalized.canonicalParams.getAll('experiences')).toEqual([
      'spa,yoga',
    ]);
    expect(normalized.canonicalParams.getAll('dietary')).toEqual(['vegan']);
  });

  it('preserves unrelated parameters and leaves tags untouched, including repeated occurrences', () => {
    const query =
      'north=12.1&south=11.1&tags=tag-a,%20tag-b&tags=tag-c&view=grid&q=%20Retreat%20';
    const params = new URLSearchParams(query);
    const normalized = normalizeDiscoveryUrlState(params, {
      validExperienceTags: EXPERIENCE_TAGS,
      validPropertyTypes: PROPERTY_TYPES,
      validDietaryOptions: DIETARY_OPTIONS,
    });

    expect(normalized.canonicalParams.get('north')).toBe('12.1');
    expect(normalized.canonicalParams.get('south')).toBe('11.1');
    expect(normalized.canonicalParams.getAll('tags')).toEqual([
      'tag-a, tag-b',
      'tag-c',
    ]);
    expect(normalized.canonicalParams.get('q')).toBe('Retreat');
    expect(normalized.canonicalParams.has('view')).toBe(false);
  });
});
