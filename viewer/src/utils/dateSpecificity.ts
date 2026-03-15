/**
 * Utility for calculating narrative timeframe specificity levels.
 * 
 * Specificity levels (from least to most specific):
 * 0. Future/Unknown (e.g., "Sometime in the future", "Future", "Unknown")
 * 1. Decade (e.g., "2010s", "2000s", "1990s")
 * 2. Partial decade (e.g., "Early 2010s", "Mid 2000s", "Late 1990s")
 * 3. Year (e.g., "2023")
 * 4. Partial year (e.g., "Late 2008", "Early 2023")
 * 5. Season (e.g., "Spring 2008", "Spring, 2008")
 * 6. Partial season (e.g., "Early Spring 2008", "late winter 2023")
 * 7. Partial month (e.g., "Early March 2003", "Late December, 2020")
 * 8. Month (e.g., "March 2023", "Mar 2023", "March, 2023")
 * 9. Day (e.g., "3/15/2023", "March 15, 2023", "Mar 15, 2023")
 * -1. Unrecognized format (seasons without years, invalid formats, etc.)
 */

/**
 * Calculates the specificity level of a narrative timeframe/displayed date string.
 * 
 * @param displayedDate - The date string to analyze
 * @returns Specificity level (0-9), or -1 if format is unrecognized
 */
export function calculateNarrativeTimeframeSpecificity(displayedDate: string): number {
  if (!displayedDate || typeof displayedDate !== 'string') {
    return 0;
  }

  const trimmed = displayedDate.trim();
  
  // Level 9: Day patterns (full date) - MOST SPECIFIC
  // Pattern 1: Numeric dates like "3/15/2023", "03-15-2023", "2023-03-15"
  const numericDatePattern = /^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/;
  if (numericDatePattern.test(trimmed)) {
    return 9;
  }
  
  // Pattern 2: Month name + day + year like "March 15, 2023" or "Mar 15, 2023"
  const monthNames = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';
  const fullDateWithMonthPattern = new RegExp(`^${monthNames}\\s+\\d{1,2},?\\s+\\d{4}$`, 'i');
  if (fullDateWithMonthPattern.test(trimmed)) {
    return 9;
  }
  
  // Level 8: Partial month patterns (modifier + month + year)
  // Pattern: "Early March 2003", "Late December, 2020", "Mid January 2023"
  const modifiers = '(?:late|early|mid)';
  const partialMonthPattern = new RegExp(`^${modifiers}\\s+${monthNames}\\s*,?\\s*\\d{4}$`, 'i');
  if (partialMonthPattern.test(trimmed)) {
    return 8;
  }
  
  // Level 7: Month patterns
  // Pattern: "March 2023", "Mar 2023", "March, 2023", "Mar, 2023"
  const monthYearPattern = new RegExp(`^${monthNames}\\s*,?\\s*\\d{4}$`, 'i');
  if (monthYearPattern.test(trimmed)) {
    return 7;
  }
  
  // Level 6: Partial season patterns (season with modifier + year)
  // Pattern: "Early Spring 2008", "late winter 2023", "mid summer 2020", "Early Spring, 2008"
  const seasons = '(?:spring|summer|fall|autumn|winter)';
  const modifiedSeasonWithYearPattern = new RegExp(`^${modifiers}\\s+${seasons}\\s*,?\\s*\\d{4}$`, 'i');
  if (modifiedSeasonWithYearPattern.test(trimmed)) {
    return 6;
  }
  
  // Level 5: Season patterns (season + year without modifier)
  // Pattern: "Spring 2008", "winter 2023", "summer 2020", "Spring, 2008"
  const seasonWithYearPattern = new RegExp(`^${seasons}\\s*,?\\s*\\d{4}$`, 'i');
  if (seasonWithYearPattern.test(trimmed)) {
    return 5;
  }
  
  // Level 4: Partial year patterns (modifier + year)
  // Pattern: "Late 2008", "Early 2023", "Mid 2020"
  const modifierWithYearPattern = new RegExp(`^${modifiers}\\s+\\d{4}$`, 'i');
  if (modifierWithYearPattern.test(trimmed)) {
    return 4;
  }
  
  // Level 3: Year patterns
  // Pattern: "2023" (4-digit number)
  const yearPattern = /^\d{4}$/;
  if (yearPattern.test(trimmed)) {
    return 3;
  }
  
  // Level 2: Partial decade patterns
  // Pattern: "Early 2010s", "Mid 2000s", "Late 1990s"
  const decadePortionPattern = new RegExp(`^${modifiers}\\s+\\d{3}0s$`, 'i');
  if (decadePortionPattern.test(trimmed)) {
    return 2;
  }
  
  // Level 1: Decade patterns
  // Pattern: "2010s", "2000s", "1990s", "1980s"
  const decadePattern = /^\d{3}0s$/;
  if (decadePattern.test(trimmed)) {
    return 1;
  }
  
  // Level 0: Future/Unknown patterns - LEAST SPECIFIC
  // Pattern: "Sometime in the future", "Future", "Unknown", "TBD", "Later"
  const futurePatterns = /^(?:sometime\s+in\s+the\s+future|future|unknown|tbd|later|eventually)$/i;
  if (futurePatterns.test(trimmed)) {
    return 0;
  }
  
  // Unrecognized format (includes seasons without years like "spring", "late spring")
  return -1;
}

