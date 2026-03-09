

# Fix Broken DanceSafe Test Strip Links

The URL `https://dancesafe.org/fentanyl-test-strips/` is broken — it now returns a raw JPEG image instead of a webpage.

## Changes

Update the link in two files to point to DanceSafe's current product page:

### `src/components/shared/SafetyChecklist.tsx`
- Change link URL from `https://dancesafe.org/fentanyl-test-strips/` to `https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/`

### `src/components/shared/HarmReductionResources.tsx`
- Change the same broken URL to `https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/`

Two lines changed across two files. No other changes needed.

