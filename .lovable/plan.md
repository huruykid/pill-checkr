

## Plan: Image Pre-Processing Pipeline

### Challenge

Deno edge functions don't support native image libraries (Sharp, etc.) — only WASM-based ones. Options are `imagescript` (Deno-native, zero-dep) or `magick-wasm` (Supabase-recommended). However, edge functions have memory/CPU limits that make heavy WASM image processing risky for production reliability.

A **hybrid approach** is most robust: do lightweight pre-processing client-side using the Canvas API (universally supported, zero latency overhead), and pass both the original and processed images to `analyze-pill`.

### Architecture

```text
User captures photo
       │
       ▼
[Client: Canvas API]
  ├── Keep original base64 (for color matching)
  └── Generate processed base64:
       • Grayscale conversion
       • Contrast boost (+60%)
       • Edge sharpening (convolution kernel)
       • Resize to max 1024px
       │
       ▼
[analyze-pill edge function]
  ├── Uses ORIGINAL image for color extraction
  └── Uses PROCESSED image for imprint OCR prompt
```

### Changes

**1. New file: `src/lib/imagePreprocess.ts`**

A pure client-side utility using Canvas API:
- `preprocessForOCR(base64: string): Promise<string>` — takes raw data URL, returns processed data URL
- Steps: load into offscreen canvas → resize to max 1024px → apply grayscale via pixel manipulation → boost contrast (multiply deviation from mean by ~1.6) → apply 3x3 sharpening convolution kernel → export as JPEG at 85% quality
- Keeps the function under ~80 lines, zero dependencies

**2. Update `src/pages/CheckPill.tsx`**

In `handleAnalyze()`, after reading the image file but before calling `analyze-pill`:
- Import and call `preprocessForOCR(imagePreview)` to get `processedImage`
- Same for `backImagePreview` if present → `processedBackImage`
- Pass both new fields in the edge function body: `processedImage`, `processedBackImage`
- Update the analysis step labels to include "Pre-processing image..." as a new step

**3. Update `supabase/functions/analyze-pill/index.ts`**

- Add `processedImage` and `processedBackImage` as optional string fields in `FullInputSchema`
- In the AI feature extraction call (Step 1), when `processedImage` is available:
  - Send the **processed** image for the OCR/imprint extraction prompt
  - Continue using the **original** image for the visual comparison step and color extraction
- The AI prompt text stays the same — the improved image quality does the work

**4. Update `src/hooks/useI18n.tsx`**

Add translation key `check.step.preprocess` — "Pre-processing image..." in all 4 languages.

### Why Client-Side, Not a Separate Edge Function

- Canvas API is instant (~50ms for a 1024px image) vs edge function cold start + WASM load (~2-3s)
- No additional network round-trip
- No WASM memory limit risk
- The AI model receives a cleaner image with the same latency budget
- If server-side pre-processing is ever needed (e.g., for API consumers), a dedicated edge function can be added later using `magick-wasm` following Supabase's documented pattern

### Scope
- 1 new file (~80 lines)
- 3 files modified (CheckPill.tsx, analyze-pill/index.ts, useI18n.tsx)
- No new dependencies
- No database changes

