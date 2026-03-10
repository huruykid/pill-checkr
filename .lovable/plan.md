

## List as Overlay on Map

Instead of toggling between full map and full list (hiding the map), make the list appear as a **draggable/scrollable overlay panel** on top of the map. The map stays visible at all times.

### Approach
- **Desktop**: List appears as a right-side panel (roughly 380px wide) overlaying the map. Map remains full-width behind it. Panel has a semi-transparent background with backdrop blur.
- **Mobile**: List appears as a bottom sheet-style overlay (takes bottom ~60% of screen), scrollable, with a drag handle. Map stays visible above.
- The toggle button changes to show/hide the overlay panel rather than swapping views.
- Map container is always `absolute inset-0 w-full` (never hidden).

### Changes
**Single file**: `src/pages/NearbyHelpMap.tsx`
- Remove the conditional hiding of the map (`hidden sm:block sm:w-1/2` class)
- Restyle the list container as an overlay panel with `bg-background/95 backdrop-blur-sm shadow-xl rounded-t-xl sm:rounded-l-xl` positioning
- On mobile: `absolute bottom-0 left-0 right-0 h-[60vh]` with overflow scroll
- On desktop: `absolute top-0 right-0 bottom-0 w-[380px]` with overflow scroll
- Add a close button inside the panel header

