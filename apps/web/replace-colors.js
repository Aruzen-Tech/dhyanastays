const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['app', 'components'];

const replacements = [
  // Backgrounds
  { regex: /bg-\[\#0A0A0A\]/g, replacement: 'bg-background' },
  { regex: /from-\[\#0A0A0A\]/g, replacement: 'from-background' },
  { regex: /via-\[\#0A0A0A\]/g, replacement: 'via-background' },
  { regex: /to-\[\#0A0A0A\]/g, replacement: 'to-background' },

  { regex: /bg-\[\#141414\]/g, replacement: 'bg-surface' },
  { regex: /from-\[\#141414\]/g, replacement: 'from-surface' },
  { regex: /via-\[\#141414\]/g, replacement: 'via-surface' },
  { regex: /to-\[\#141414\]/g, replacement: 'to-surface' },

  { regex: /bg-\[\#1A1A1A\]/g, replacement: 'bg-surface-hover' },
  { regex: /from-\[\#1A1A1A\]/g, replacement: 'from-surface-hover' },
  { regex: /via-\[\#1A1A1A\]/g, replacement: 'via-surface-hover' },
  { regex: /to-\[\#1A1A1A\]/g, replacement: 'to-surface-hover' },

  { regex: /bg-\[\#2A2A2A\]/g, replacement: 'bg-border' },

  // Borders
  { regex: /border-\[\#2A2A2A\]/g, replacement: 'border-border' },
  { regex: /divide-\[\#2A2A2A\]/g, replacement: 'divide-border' },
  { regex: /border-\[\#1A1A1A\]/g, replacement: 'border-surface-hover' },
  { regex: /border-\[\#0A0A0A\]/g, replacement: 'border-background' },
  { regex: /border-\[\#333333\]/g, replacement: 'border-border-light' },
  { regex: /border-\[\#333\]/g, replacement: 'border-border-light' },

  // Text Colors
  { regex: /text-\[\#FAFAF5\]/g, replacement: 'text-foreground' },
  { regex: /text-\[\#A3A3A0\]/g, replacement: 'text-muted' },
  { regex: /text-\[\#6B6B68\]/g, replacement: 'text-subtle' },

  // Inverse Text (on Gold Buttons)
  { regex: /text-\[\#0A0A0A\]/g, replacement: 'text-primary-foreground' },

  // Brand Colors (Gold)
  { regex: /text-\[\#C9A96E\]/g, replacement: 'text-primary' },
  { regex: /bg-\[\#C9A96E\]/g, replacement: 'bg-primary' },
  { regex: /border-\[\#C9A96E\]/g, replacement: 'border-primary' },
  { regex: /from-\[\#C9A96E\]/g, replacement: 'from-primary' },
  { regex: /to-\[\#C9A96E\]/g, replacement: 'to-primary' },
  { regex: /fill-\[\#C9A96E\]/g, replacement: 'fill-primary' },

  // Brand Secondary/Hover
  { regex: /text-\[\#D4BC8E\]/g, replacement: 'text-primary-hover' },
  { regex: /bg-\[\#D4BC8E\]/g, replacement: 'bg-primary-hover' },
  { regex: /border-\[\#D4BC8E\]/g, replacement: 'border-primary-hover' },
  { regex: /from-\[\#D4BC8E\]/g, replacement: 'from-primary-hover' },
  { regex: /to-\[\#D4BC8E\]/g, replacement: 'to-primary-hover' },

  { regex: /to-\[\#A88B4A\]/g, replacement: 'to-primary-dark' },

  // Other Accents
  { regex: /text-\[\#7A8B6F\]/g, replacement: 'text-sage' },
  { regex: /bg-\[\#7A8B6F\]/g, replacement: 'bg-sage' },

  // Hardcoded variants like bg-[#C9A96E]/10
  // Note: Tailwind handles opacity automatically with semantic variables like bg-primary/10 if set up correctly

  // ============================================
  // Round 2: remaining stragglers found after first pass
  // (opacity suffixes like /5, /20 are preserved automatically
  // since the regex only matches the bg-[#HEX] prefix)
  // ============================================

  // Section-alternation background (near-black, distinct from card bg-surface)
  { regex: /bg-\[\#0F0F0F\]/g, replacement: 'bg-background' },

  // Placeholder gradient stops (decorative "no image" boxes)
  { regex: /bg-\[\#242424\]/g, replacement: 'bg-surface-hover' },
  { regex: /from-\[\#242424\]/g, replacement: 'from-surface-hover' },
  { regex: /via-\[\#242424\]/g, replacement: 'via-surface-hover' },
  { regex: /to-\[\#242424\]/g, replacement: 'to-surface-hover' },
  { regex: /from-\[\#1E1E1E\]/g, replacement: 'from-surface-hover' },
  { regex: /via-\[\#1E1E1E\]/g, replacement: 'via-surface-hover' },
  { regex: /to-\[\#1E1E1E\]/g, replacement: 'to-surface-hover' },
  { regex: /to-\[\#2A2A2A\]/g, replacement: 'to-border' },

  // Dim/quiet text & dividers (value matches --color-border in dark mode)
  { regex: /text-\[\#2A2A2A\]/g, replacement: 'text-border' },

  // Neutral dividers/placeholders (value matches --color-text-tertiary, same in both themes)
  { regex: /border-\[\#6B6B68\]/g, replacement: 'border-subtle' },
  { regex: /bg-\[\#6B6B68\]/g, replacement: 'bg-subtle' },
  { regex: /placeholder-\[\#6B6B68\]/g, replacement: 'placeholder-subtle' },

  // Input placeholders (value matches --color-text-secondary / text-muted)
  { regex: /placeholder-\[\#4A4A48\]/g, replacement: 'placeholder-muted' },

  // Sage accents
  { regex: /border-\[\#7A8B6F\]/g, replacement: 'border-sage' },
  { regex: /hover:bg-\[\#8CA081\]/g, replacement: 'hover:bg-sage/80' },

  // Terracotta accent
  { regex: /bg-\[\#C17A5E\]/g, replacement: 'bg-terracotta' },

  // Checkbox/radio accent color
  { regex: /accent-\[\#C9A96E\]/g, replacement: 'accent-primary' },

  // Foreground-tinted overlays on alternating dark sections (value matches --color-text-primary in dark mode)
  { regex: /bg-\[\#FAFAF5\]/g, replacement: 'bg-foreground' },
  { regex: /border-\[\#FAFAF5\]/g, replacement: 'border-foreground' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { regex, replacement } of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  }

  // Also replace arbitrary value variables like: bg-[#0A0A0A]/50 -> bg-background/50
  // The above regexes might miss the /50 part, actually wait, bg-[#0A0A0A]/50 will be replaced as bg-background/50 by the first regex because /50 is trailing!
  // e.g. `bg-[#0A0A0A]/50` matches `bg-[#0A0A0A]` and replaces it, resulting in `bg-background/50`. This is PERFECT because Tailwind 4 supports alpha suffix natively.

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const absoluteDir = path.resolve(__dirname, dir);
  if (!fs.existsSync(absoluteDir)) return;

  const files = fs.readdirSync(absoluteDir);
  for (const file of files) {
    const fullPath = path.join(absoluteDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

DIRECTORIES.forEach(dir => walkDir(dir));
console.log('Done replacing colors!');
