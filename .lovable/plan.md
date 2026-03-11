

## SEO Improvements Plan

### 1. Static `sitemap.xml` in `/public`
Create `public/sitemap.xml` listing all public routes: `/`, `/check`, `/education`, `/nearby-help`, `/auth`, `/history`. Exclude dynamic routes like `/results/:id` and `/admin`. Use the published domain `https://pill-checkr.lovable.app` as the base URL. Add `Sitemap:` directive to `robots.txt`.

### 2. `SEOHead` component with per-page meta + JSON-LD + canonical
Create a reusable `src/components/shared/SEOHead.tsx` component that uses `document.title` and injects/updates `<meta>` tags and `<link rel="canonical">` and a `<script type="application/ld+json">` block into `<head>` via `useEffect`. Props: `title`, `description`, `path`, `type` (for JSON-LD).

### 3. Add `SEOHead` to every page
Each page gets unique title/description:
- **Index**: "Fent Finder - Free Pill Safety Check Tool" / "Free harm reduction tool..."
- **CheckPill**: "Check a Pill | Fent Finder" / "Upload a photo of your pill..."
- **Education**: "Drug Safety Education | Fent Finder" / "Learn about counterfeit pills..."
- **History**: "Your Check History | Fent Finder" / "View your past pill checks..."
- **NearbyHelpMap**: "Find Help Near You | Fent Finder" / "Find naloxone, testing..."
- **Auth**: "Sign In | Fent Finder" / "Create an account..."
- **Settings**: "Settings | Fent Finder"
- **Results**: "Pill Analysis Results | Fent Finder"

### 4. JSON-LD structured data
- **Index**: `WebSite` schema with `potentialAction: SearchAction`
- **Education**: `Article` schema for individual posts, `CollectionPage` for listing
- **CheckPill**: `WebApplication` schema
- Other pages: basic `WebPage` schema

### Files to create/modify
- **Create**: `public/sitemap.xml`
- **Create**: `src/components/shared/SEOHead.tsx`
- **Modify**: `public/robots.txt` (add Sitemap line)
- **Modify**: All page components (Index, CheckPill, Results, History, Education, Auth, Settings, NearbyHelpMap, NotFound) to include `<SEOHead>`

