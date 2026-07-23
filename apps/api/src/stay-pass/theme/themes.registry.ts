/**
 * Built-in launch theme bundles (spec §2.5). These are the guaranteed fallback
 * and the seed source for the `StayTheme` table — a missing/retired DB theme
 * degrades to `DEFAULT_THEME`, never failing the render pipeline (spec §2.4).
 */
export interface ThemeTokens {
  palette: {
    primary: string;
    surface: string;
    text_dark: string;
    text_mid: string;
    on_dark: string;
  };
  motif: string;
  pattern: string;
  icon: string;
  type_accent: string;
  mood_line: string;
  stamp_shape: 'hex' | 'circle' | 'arch' | 'wave' | 'leaf' | 'square';
}

export interface ThemeBundle {
  id: string;
  version: number;
  displayName: string;
  tokens: ThemeTokens;
}

const T = (
  id: string,
  displayName: string,
  tokens: ThemeTokens,
): ThemeBundle => ({ id, version: 1, displayName, tokens });

export const LAUNCH_THEMES: ThemeBundle[] = [
  T('forest_villa', 'Forest villa', {
    palette: { primary: '#0F6E56', surface: '#E1F5EE', text_dark: '#085041', text_mid: '#0F6E56', on_dark: '#FFFFFF' },
    motif: 'canopy_leaves', pattern: 'leaf_scatter', icon: 'trees', type_accent: 'serif_display',
    mood_line: 'Nights under the canopy', stamp_shape: 'hex',
  }),
  T('heritage', 'Heritage', {
    palette: { primary: '#B4791F', surface: '#F7EFDD', text_dark: '#5C3D0E', text_mid: '#B4791F', on_dark: '#FFFFFF' },
    motif: 'jaali_arch', pattern: 'arch_repeat', icon: 'arch', type_accent: 'serif_display',
    mood_line: 'Where stories are kept', stamp_shape: 'arch',
  }),
  T('beachfront', 'Beachfront', {
    palette: { primary: '#1466A6', surface: '#DCEEF9', text_dark: '#0B3F68', text_mid: '#1466A6', on_dark: '#FFFFFF' },
    motif: 'wave', pattern: 'wave_lines', icon: 'waves', type_accent: 'sans_display',
    mood_line: 'Salt air and slow mornings', stamp_shape: 'wave',
  }),
  T('treehouse', 'Treehouse', {
    palette: { primary: '#2F7D32', surface: '#E6F3E1', text_dark: '#1B4D1E', text_mid: '#2F7D32', on_dark: '#FFFFFF' },
    motif: 'branch', pattern: 'branch_scatter', icon: 'branch', type_accent: 'serif_display',
    mood_line: 'Perched among the branches', stamp_shape: 'leaf',
  }),
  T('retreat', 'Retreat', {
    palette: { primary: '#6A4CA6', surface: '#EDE6F7', text_dark: '#3D2A66', text_mid: '#6A4CA6', on_dark: '#FFFFFF' },
    motif: 'lotus_mandala', pattern: 'mandala', icon: 'lotus', type_accent: 'serif_display',
    mood_line: 'A quiet turning inward', stamp_shape: 'circle',
  }),
  T('farm_stay', 'Farm stay', {
    palette: { primary: '#C25B3F', surface: '#F8E7DF', text_dark: '#6E2D1A', text_mid: '#C25B3F', on_dark: '#FFFFFF' },
    motif: 'field_rows', pattern: 'field_lines', icon: 'wheat', type_accent: 'sans_display',
    mood_line: 'From the soil, with care', stamp_shape: 'square',
  }),
];

/** Guaranteed fallback — evergreen brand identity. */
export const DEFAULT_THEME: ThemeBundle = LAUNCH_THEMES[0];

export const LAUNCH_THEMES_BY_ID: Record<string, ThemeBundle> = Object.fromEntries(
  LAUNCH_THEMES.map((t) => [t.id, t]),
);
