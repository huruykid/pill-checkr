import { forwardRef, useEffect } from "react";

const BASE_URL = "https://pill-checkr.lovable.app";
const SITE_NAME = "Fent Finder";

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>;
}

export const SEOHead = forwardRef<HTMLDivElement, SEOHeadProps>(function SEOHead({ title, description, path, jsonLd }, _ref) {
  useEffect(() => {
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", `${BASE_URL}${path}`);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${BASE_URL}${path}`);

    // JSON-LD
    const jsonLdId = "seo-jsonld";
    let script = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.id = jsonLdId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const s = document.getElementById(jsonLdId);
      if (s) s.remove();
    };
  }, [title, description, path, jsonLd]);

  return null;
}

// Pre-built JSON-LD helpers
export const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: BASE_URL,
  description: "A free harm reduction tool to help assess pill consistency with known references.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/check`,
    "query-input": "required name=search_term_string",
  },
};

export const jsonLdWebApp = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `${SITE_NAME} Pill Checker`,
  url: `${BASE_URL}/check`,
  applicationCategory: "HealthApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: "Upload a photo of your pill to visually compare it against known reference images.",
};

export const makeWebPage = (name: string, path: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name,
  url: `${BASE_URL}${path}`,
  description,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: BASE_URL },
});

export const makeArticle = (title: string, slug: string, summary: string, datePublished: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  url: `${BASE_URL}/education/${slug}`,
  description: summary,
  datePublished,
  publisher: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
});
