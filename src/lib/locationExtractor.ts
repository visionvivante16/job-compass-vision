/**
 * Extracts location from job description when the stored location is suspicious.
 * Uses regex patterns to find city/state combos, "Remote" markers, etc.
 * Also sanitizes locations that contain analytics/tracking JavaScript code.
 */

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const STATE_ABBREVS = new Set(Object.keys(US_STATES));

// Known major cities for quick matching (US + international)
const MAJOR_CITIES = [
  'New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Seattle',
  'Denver', 'Nashville', 'Las Vegas', 'Portland', 'Atlanta', 'Boston',
  'Detroit', 'Miami', 'Minneapolis', 'Tampa', 'Orlando', 'Raleigh',
  'Pittsburgh', 'Cincinnati', 'St. Louis', 'Baltimore', 'Milwaukee',
  'Sacramento', 'Charlotte', 'Indianapolis', 'Columbus', 'Kansas City',
  'Salt Lake City', 'San Antonio', 'Arlington', 'Irvine', 'Plano',
  'Redmond', 'Cupertino', 'Mountain View', 'Palo Alto', 'Sunnyvale',
  'Washington', 'McLean', 'Tysons', 'Herndon', 'Reston', 'Richmond',
];

/**
 * Detect if a stored location contains JavaScript/analytics tracking code.
 */
function containsTrackingCode(location: string): boolean {
  const trackingPatterns = [
    /document\./i,
    /window\./i,
    /dispatchEvent/i,
    /analytics/i,
    /pageType/i,
    /cookieID/i,
    /jobFindingMethod/i,
    /userActionStore/i,
    /pageInfo/i,
    /siteSection/i,
    /peopleSoftId/i,
    /experimentDetails/i,
    /referrer/i,
    /\bfunction\s*\(/i,
    /\bvar\s+\w/i,
    /\bconst\s+\w/i,
    /\blet\s+\w/i,
    /\{[\s\S]*:\s*[\s\S]*\}/,  // Object literals
  ];
  return trackingPatterns.some(p => p.test(location));
}

/**
 * Detect if a stored location looks suspicious and should be replaced.
 */
export function isSuspiciousLocation(location: string | null | undefined): boolean {
  if (!location) return true;
  const trimmed = location.trim();
  if (trimmed.length === 0) return true;
  if (/^nan$/i.test(trimmed)) return true;
  if (/^not specified$/i.test(trimmed)) return true;

  // Contains JS tracking/analytics code
  if (containsTrackingCode(trimmed)) return true;

  // Location is excessively long (likely contains embedded code/data)
  if (trimmed.length > 120) return true;

  // Just a 2-letter code (state abbrev or country code)
  if (/^[A-Z]{2}$/i.test(trimmed)) return true;

  // Just a 2-3 letter code
  if (trimmed.length <= 3 && /^[a-zA-Z]+$/.test(trimmed)) return true;

  return false;
}

/**
 * Try to salvage a valid city/state from a contaminated location string.
 * e.g. 'single", jobFindingMethod: ...' might not yield anything,
 * but 'San Francisco, CA | analytics...' could yield 'San Francisco, CA'.
 */
function salvageFromContaminatedLocation(location: string): string | null {
  // Try to extract "City, ST" before the contamination starts
  const cityStateMatch = location.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
  if (cityStateMatch && STATE_ABBREVS.has(cityStateMatch[2])) {
    return `${cityStateMatch[1]}, ${cityStateMatch[2]}`;
  }

  // Try to find a known city at the start
  for (const city of MAJOR_CITIES) {
    if (location.startsWith(city)) {
      return city;
    }
  }

  return null;
}

/**
 * Extract location from job description text using regex patterns.
 * Returns the best match or null if nothing found.
 */
export function extractLocationFromDescription(description: string): string | null {
  if (!description || description.length < 20) return null;

  // Scan more of the description - locations can appear deep in the text
  const text = description.slice(0, 6000);

  // Pattern 0: "based at/in [Place] headquarters in City, ST" or "team is based in City, ST"
  const basedInPattern = /(?:based (?:at|in)|headquartered in|offices? in|located in)\s+(?:\w+\s+)*?(?:headquarters\s+in\s+)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/g;
  let basedMatch;
  while ((basedMatch = basedInPattern.exec(text)) !== null) {
    const [, city, state] = basedMatch;
    if (STATE_ABBREVS.has(state) && city.length > 1) {
      return `${city}, ${state}`;
    }
  }

  // Pattern 1: "Location: City, Country" or "Location: City, State" labels
  const locationLabelPattern = /(?:location|based in|office in|headquartered in|located in|work location|job location)[:\s]+([A-Z][a-zA-Z\s,]+?)(?:\.|;|\n|$)/im;
  const labelMatch = text.match(locationLabelPattern);
  if (labelMatch) {
    const loc = labelMatch[1].trim().replace(/[.;]$/, '');
    if (loc.length >= 4 && loc.length <= 80) {
      // Verify it's not just noise
      if (!containsTrackingCode(loc)) return loc;
    }
  }

  // Pattern 2: "City, ST" format (e.g., "Washington, DC" or "San Francisco, CA")
  const cityStatePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/g;
  let match;
  while ((match = cityStatePattern.exec(text)) !== null) {
    const [, city, state] = match;
    if (STATE_ABBREVS.has(state) && city.length > 1) {
      return `${city}, ${state}`;
    }
  }

  // Pattern 3: Known major US city names
  for (const city of MAJOR_CITIES) {
    const cityRegex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (cityRegex.test(text)) {
      // Try to find the state after the city
      const afterCity = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},?\\s*([A-Z]{2})\\b`, 'i');
      const afterMatch = text.match(afterCity);
      if (afterMatch && STATE_ABBREVS.has(afterMatch[1].toUpperCase())) {
        return `${city}, ${afterMatch[1].toUpperCase()}`;
      }
      return city;
    }
  }

  // Pattern 4: Remote indicators — only US remote
  const remotePattern = /\b(remote|work from home|wfh|telecommute|fully remote|hybrid remote)\b/i;
  const remoteMatch = text.match(remotePattern);
  if (remoteMatch) {
    return 'Remote - US';
  }

  return null;
}

/**
 * Get the best location for a job: use stored location if valid,
 * otherwise try to extract from description.
 */
export function getBestLocation(storedLocation: string, description: string): string {
  // First check if location contains tracking/analytics code
  if (containsTrackingCode(storedLocation)) {
    // Try to salvage a real location from the contaminated string
    const salvaged = salvageFromContaminatedLocation(storedLocation);
    if (salvaged) return salvaged;
    
    // Fall through to description extraction
    const extracted = extractLocationFromDescription(description);
    if (extracted) return extracted;
    return 'Location not specified';
  }

  if (!isSuspiciousLocation(storedLocation)) {
    return storedLocation;
  }

  const extracted = extractLocationFromDescription(description);
  if (extracted) return extracted;

  // Fallback to stored location if we have nothing better
  return storedLocation || 'Location not specified';
}
