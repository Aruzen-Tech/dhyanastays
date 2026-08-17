/**
 * Single source of truth for the Explore page's content width — the hero
 * banner and the stays listing section must always share this exact
 * max-width/padding/centering, never two independently-tuned values that
 * can drift apart. Vertical padding is deliberately excluded (each section
 * has its own rhythm); this covers only the horizontal box.
 */
export const EXPLORE_CONTAINER_CLASS = 'w-full px-5 sm:px-8 lg:px-12 xl:px-16 2xl:px-24';
