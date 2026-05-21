/**
 * USA-only location filter.
 * Determines whether a job location string refers to a US-based role.
 */

const US_STATES_ABBR = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

const US_STATE_NAMES = [
  'alabama','alaska','arizona','arkansas','california','colorado',
  'connecticut','delaware','florida','georgia','hawaii','idaho',
  'illinois','indiana','iowa','kansas','kentucky','louisiana',
  'maine','maryland','massachusetts','michigan','minnesota',
  'mississippi','missouri','montana','nebraska','nevada',
  'new hampshire','new jersey','new mexico','new york',
  'north carolina','north dakota','ohio','oklahoma','oregon',
  'pennsylvania','rhode island','south carolina','south dakota',
  'tennessee','texas','utah','vermont','virginia','washington',
  'west virginia','wisconsin','wyoming','district of columbia',
];

// Non-US countries / regions that should be rejected
const NON_US_INDICATORS = [
  'canada','mexico','india','uk','united kingdom','england','scotland','wales',
  'ireland','germany','france','spain','italy','netherlands','sweden','norway',
  'denmark','finland','switzerland','austria','belgium','portugal','poland',
  'czech','romania','hungary','greece','turkey','israel','japan','china',
  'korea','singapore','australia','new zealand','brazil','argentina','colombia',
  'chile','philippines','indonesia','malaysia','thailand','vietnam','taiwan',
  'hong kong','dubai','uae','saudi','qatar','egypt','nigeria','kenya',
  'south africa','ukraine','russia','slovenia','croatia','serbia','estonia',
  'latvia','lithuania','luxembourg','iceland','bulgaria','slovakia',
  'british columbia','alberta','ontario','quebec','manitoba','saskatchewan',
  'europe','asia','africa','latin america','apac','emea','global',
];

/**
 * Returns true if the location string indicates a USA-based role.
 * Remote jobs are only included if they mention US/USA context.
 */
export function isUSALocation(location: string | null | undefined): boolean {
  if (!location || !location.trim()) return false;

  const loc = location.trim();
  const lower = loc.toLowerCase();

  // Reject if contains non-US country/region indicators
  for (const indicator of NON_US_INDICATORS) {
    // Check for standalone mentions (not as part of "New Mexico" etc.)
    if (lower.includes(indicator)) {
      // Special case: "New Mexico" contains "mexico" — allow it
      if (indicator === 'mexico' && lower.includes('new mexico')) continue;
      // Special case: "New England" — allow it
      if (indicator === 'england' && lower.includes('new england')) continue;
      // Special case: location also explicitly mentions US
      if (lower.includes(', us') || lower.includes('usa') || lower.includes('united states')) {
        // If it's a multi-location with non-US, reject
        if (lower.includes(';') || lower.includes('|')) return false;
        continue;
      }
      return false;
    }
  }

  // Direct US markers
  if (/\bUS\b/.test(loc) || /\bUSA\b/i.test(loc) || /united states/i.test(loc)) return true;

  // Check for US state abbreviation at end: "City, ST" or "City, ST, US" or "City, ST (Remote)"
  const stateAbbrMatch = loc.match(/,\s*([A-Z]{2})\s*(?:,\s*US)?(?:\s*\(.*\))?\s*$/);
  if (stateAbbrMatch && US_STATES_ABBR.has(stateAbbrMatch[1])) return true;

  // Check for state abbreviation in middle: "City, ST, US"
  const midStateMatch = loc.match(/,\s*([A-Z]{2})\s*,/);
  if (midStateMatch && US_STATES_ABBR.has(midStateMatch[1])) return true;

  // Check for full state names
  for (const state of US_STATE_NAMES) {
    if (lower.includes(state)) return true;
  }

  // Remote with US context
  if (/remote/i.test(loc)) {
    if (/\bUS\b/.test(loc) || /\bUSA\b/i.test(loc) || /united states/i.test(loc)) return true;
    // "Remote" alone or with non-US context → reject
    return false;
  }

  // Major US cities without state (common patterns)
  const usCities = [
    'new york city','nyc','los angeles','san francisco','chicago',
    'houston','phoenix','philadelphia','san antonio','san diego',
    'dallas','san jose','austin','jacksonville','fort worth',
    'columbus','charlotte','indianapolis','seattle','denver',
    'nashville','oklahoma city','las vegas','portland','memphis',
    'louisville','baltimore','milwaukee','albuquerque','tucson',
    'fresno','sacramento','mesa','atlanta','kansas city',
    'omaha','colorado springs','raleigh','long beach','virginia beach',
    'miami','oakland','minneapolis','tampa','arlington','tulsa',
    'bakersfield','aurora','anaheim','honolulu','santa ana',
    'riverside','stockton','henderson','lexington','pittsburgh',
    'st. louis','saint louis','st louis','cincinnati','anchorage',
    'greensboro','plano','lincoln','orlando','irvine','newark',
    'durham','chula vista','toledo','fort wayne','st. petersburg',
    'laredo','jersey city','chandler','madison','lubbock','scottsdale',
    'reno','buffalo','gilbert','glendale','north las vegas',
    'winston-salem','chesapeake','norfolk','fremont','garland',
    'irving','richmond','boise','spokane','silicon valley',
    'bay area','research triangle','boston','detroit',
  ];

  for (const city of usCities) {
    if (lower.includes(city)) return true;
  }

  return false;
}

/**
 * Filter an array of jobs to USA-only.
 */
export function filterUSAJobs<T extends { location: string }>(jobs: T[]): T[] {
  return jobs.filter(job => isUSALocation(job.location));
}
