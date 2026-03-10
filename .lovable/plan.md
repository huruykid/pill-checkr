

## Add Education Article: Fentanyl in Vape Cartridges

### What
Insert a new row into the `education_posts` table with a comprehensive article about fentanyl-laced vape cartridges.

### Content Outline
- **Slug**: `fentanyl-vape-cartridges`
- **Title**: "Fentanyl in Vape Cartridges: What You Need to Know"
- **Summary**: "How to spot suspect cartridges, test vape liquid for fentanyl, and reduce your risk"
- **Body** (markdown-style matching existing format):
  1. **What's happening** — Counterfeit THC/cannabis carts laced with fentanyl; primarily unregulated/street-sourced, not commercial nicotine vapes
  2. **How to identify suspect carts** — No brand verification, unusual packaging, abnormal taste/effects, purchased from unverified sources
  3. **How to test vape liquid** — Dissolve a small amount in water, use fentanyl test strips, interpret results
  4. **Harm reduction tips for vaping** — Start with tiny puffs, never use alone, keep naloxone nearby, call Never Use Alone hotline
  5. **What to do if someone overdoses** — Recognize symptoms, administer naloxone, call 911

### Implementation
Single database migration to INSERT the new article. No code changes needed — the Education page already renders posts dynamically from the database.

