/**
 * Detects attempts to share a phone / mobile / telephone / contact number in a
 * chat message, including common obfuscation (spaced/dashed digits, spelled-out
 * digits, "double/triple N"). Off-platform contact sharing is blocked so the
 * conversation — and its dispute trail — stays on Dhyana Stays.
 *
 * Bias: catch contact-sharing over letting it slip. A rejected message is
 * recoverable ("try a different message"); a leaked number is not. Prices,
 * dates, guest counts and pincodes stay allowed (they don't reach 10 digits).
 */

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
  oh: '0', o: '0', nought: '0', zeero: '0',
};

const CONTACT_KEYWORDS =
  'phone|mobile|whats\\s?app|call|contact|reach|ping|tel|telephone|number|no\\.?|num|cell|dial';

/** Expand "nine eight seven…" and "double 5" / "triple 0" into digit runs. */
function expandSpelledDigits(input: string): string {
  let text = input;

  // "double 5" → "55", "triple 0" → "000" (word or digit operand).
  text = text.replace(/\b(double|triple)\s+([a-z0-9]+)/gi, (m, mult: string, operand: string) => {
    const digit = /^\d$/.test(operand) ? operand : DIGIT_WORDS[operand.toLowerCase()];
    if (digit === undefined) return m;
    return digit.repeat(mult.toLowerCase() === 'double' ? 2 : 3);
  });

  // Standalone digit words → digits.
  text = text.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|oh|nought)\b/gi,
    (m) => DIGIT_WORDS[m.toLowerCase()] ?? m,
  );

  return text;
}

/**
 * @returns true when the text looks like it contains a phone/contact number.
 */
export function containsContactNumber(raw: string): boolean {
  if (!raw) return false;

  const text = expandSpelledDigits(raw.toLowerCase());

  // Collapse separators that sit *between* digits (space, dot, dash, slash,
  // brackets, +) so "98765 43210", "+91-98765-43210", "9 8 7 6 5 4 3 2 1 0"
  // become one run. Letters between numbers are NOT separators, so "45000 and
  // 12000" stays as two short runs.
  const compact = text.replace(/(\d)[\s.\-–—/()\[\]+]+(?=\d)/g, '$1');

  // A run of 10+ digits — an Indian mobile (10), or +country variants (11–13).
  if (/\d{10,}/.test(compact)) return true;

  // A shorter 7–9 digit run sitting next to a contact keyword (landlines /
  // partial shares like "call me on 4012 3456"). 7-digit floor keeps pincodes
  // and flat numbers ("flat number 605001") allowed.
  const keywordNearNumber = new RegExp(
    `(?:${CONTACT_KEYWORDS})\\D{0,14}\\d(?:[\\s.\\-]?\\d){6,}`,
    'i',
  );
  if (keywordNearNumber.test(text)) return true;

  return false;
}

/** User-facing rejection message when a contact number is detected. */
export const CONTACT_BLOCK_MESSAGE =
  'This message type is not allowed — sharing phone or contact numbers is blocked. Please try a different message.';
