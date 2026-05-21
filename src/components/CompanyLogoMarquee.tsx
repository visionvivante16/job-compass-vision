import { useMemo } from "react";

const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Apple",
  "Meta",
  "Netflix",
  "Tesla",
  "Nvidia",
  "Adobe",
  "Salesforce",
  "Oracle",
  "IBM",
  "Intel",
  "Spotify",
  "Airbnb",
  "Uber",
  "Stripe",
  "Shopify",
  "LinkedIn",
  "Snowflake",
];

function logoUrl(company: string) {
  const domainMap: Record<string, string> = {
    Google: "google.com",
    Microsoft: "microsoft.com",
    Amazon: "amazon.com",
    Apple: "apple.com",
    Meta: "meta.com",
    Netflix: "netflix.com",
    Tesla: "tesla.com",
    Nvidia: "nvidia.com",
    Adobe: "adobe.com",
    Salesforce: "salesforce.com",
    Oracle: "oracle.com",
    IBM: "ibm.com",
    Intel: "intel.com",
    Spotify: "spotify.com",
    Airbnb: "airbnb.com",
    Uber: "uber.com",
    Stripe: "stripe.com",
    Shopify: "shopify.com",
    LinkedIn: "linkedin.com",
    Snowflake: "snowflake.com",
  };
  const domain = domainMap[company] ?? `${company.toLowerCase()}.com`;
  // Google's favicon service is highly reliable and CORS-friendly
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function CompanyLogoMarquee() {
  // Duplicate list for a seamless infinite scroll
  const items = useMemo(() => [...COMPANIES, ...COMPANIES], []);

  return (
    <div className="relative w-full overflow-hidden mb-10" aria-label="Featured companies">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="flex w-max animate-logo-marquee gap-10 py-2">
        {items.map((company, idx) => (
          <div
            key={`${company}-${idx}`}
            className="flex items-center gap-3 h-12 shrink-0 px-4 rounded-xl bg-card/40 border border-border/40 opacity-80 hover:opacity-100 hover:border-accent/40 transition-all duration-300"
            title={company}
          >
            <img
              src={logoUrl(company)}
              alt={`${company} logo`}
              loading="lazy"
              width={28}
              height={28}
              className="h-7 w-7 object-contain rounded-sm"
            />
            <span className="font-display font-semibold text-foreground/80 text-sm whitespace-nowrap">
              {company}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
