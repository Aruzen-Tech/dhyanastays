'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { platformFeaturesApi } from '../lib/api';
import type { FeatureEnabledMap } from '../lib/types';

interface FeatureContextValue {
  /** key → enabled. Missing key defaults to enabled (fail-open for the UI). */
  features: FeatureEnabledMap;
  isLoading: boolean;
  /** Convenience: is a feature on? Unknown keys → true. */
  isEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextValue>({
  features: {},
  isLoading: true,
  isEnabled: () => true,
  refresh: async () => {},
});

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<FeatureEnabledMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const map = await platformFeaturesApi.enabledMap();
      setFeatures(map);
    } catch {
      // Fail-open: if the endpoint is unreachable, don't hide everything.
      setFeatures({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isEnabled = useCallback(
    (key: string) => features[key] !== false, // undefined or true → enabled
    [features],
  );

  return (
    <FeatureContext.Provider value={{ features, isLoading, isEnabled, refresh }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  return useContext(FeatureContext);
}

/** Hook helper: is a single feature enabled? */
export function useFeature(key: string): boolean {
  return useContext(FeatureContext).isEnabled(key);
}
