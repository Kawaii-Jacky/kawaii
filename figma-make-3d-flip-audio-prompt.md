# Figma Make Prompt: Reusable Character Gacha Screen

Use the attached `GachaScreen Template` component as the visual source of truth. Preserve its current 1600 x 900 composition, black/white editorial base, cut-paper geometry, transparent character-name typography, spacing, and layer order. Build the working interactive screen as the first view. Do not make a landing page and do not redesign the resting state.

## Architecture

Implement the Figma structure as reusable React + TypeScript components:

- `GachaScreen`
- `CharacterTitle`
- `FloatingArchiveCard`
- `BannerTab`
- `ResourceCapsule`
- `WishButton`
- `PityPanel`
- `NavItem`
- `GachaNavbar`

Every component must preserve three independent layers:

1. `Base Layer`: fixed black, white, gray, transparent material and layout.
2. `Theme Layer`: theme variables only.
3. `Character Layer`: names, index, artwork, faction, copy, textures, costs, and progress data.

Use data and CSS variables instead of character-specific CSS:

```ts
type CharacterTheme = {
  accentPrimary: string;
  accentSecondary: string;
  accentSoft: string;
  appearance: "light" | "dark";
};

type CharacterData = {
  chineseName: string;
  englishName: string;
  index: string;
  artworkUrl: string;
  faction?: string;
  category?: string;
  quote?: string;
  textureUrl?: string;
};
```

Do not hardcode red, stars, chains, revolutionary slogans, Marx copy, or any other character motif. Replacing `CharacterData` and `CharacterTheme` must produce a valid screen without editing component CSS.

## Character artwork and title

- Replace the Figma `Character Artwork` instance-swap placeholder with `artworkUrl`.
- Keep artwork unframed and transparent when the source permits.
- Keep the title outside cards with no background and no border.
- Use the same typography system for every character: `Noto Sans SC` for Chinese and `Inter` for Latin/index text.
- Support `light`, `dark`, and `outline` title contrast modes.
- Preserve echo text, clipping, opacity, and blend effects from Figma.
- Allow artwork to occlude part of the title by using explicit z-index layers. Do not flatten the title into the artwork image.

## True 3D card entrance

Apply the entrance to `FloatingArchiveCard` and other floating paper components. Use real CSS perspective, not a 2D scale imitation:

- perspective parent: `1000px`
- `transform-style: preserve-3d`
- start: `rotateY(-72deg) translateY(24px) scale(0.92)`
- end: `rotateY(0deg) translateY(0) scale(1)`
- opacity: `0 -> 1`
- blur: `8px -> 0`
- duration: `620ms` within the allowed `520-680ms` range
- easing: `cubic-bezier(.18,.82,.24,1)`
- `backface-visibility: hidden`
- stagger repeated cards by `80ms` within the allowed `60-90ms` range

The neutral back face may use grayscale paper texture, index marks, registration fragments, and generic archive typography. It must not contain a character color or symbol.

After entrance, do not continuously swing cards. A card may float by only `3px` on hover and tilt by at most `3deg`. On press, return toward a flat plane and scale to `0.97`. Transforms must never change layout dimensions.

## Interaction states

- Map Figma Default, Hover, Pressed, Disabled, Selected, Emphasis, and Alert variants to component state.
- `BannerTab` changes selection without changing its outer dimensions.
- `WishButton` uses the same component for one wish and ten wishes; count, label, and cost come from props.
- `PityPanel` accepts progress text and numeric progress; progress width is computed from data.
- Exposed navbar items and resource values remain editable data.
- Add keyboard activation and a neutral `:focus-visible` indicator that does not depend on the character accent.

## Audio system

Create an opt-in reusable Web Audio engine. Do not use copyrighted game audio.

- card entrance: short paper-card flip sound at about 40% of the animation
- rare entrance: layer a restrained metallic overtone over the paper flip
- hover: optional very quiet paper friction, rate-limited and disabled by default
- confirm wish: clear but restrained mechanical latch
- do not retrigger ordinary hover audio on every pointer movement
- default master volume: `0.35`
- provide a persistent global mute toggle
- preload or initialize audio only after the first user gesture
- handle browser autoplay restrictions
- prevent overlapping repeated entrance sounds from clipping

Prefer replaceable procedural Web Audio sounds using filtered noise and short oscillator envelopes. Keep a clean adapter so local audio files can replace them later.

## Accessibility and performance

- Respect `prefers-reduced-motion: reduce`; replace 3D entrance with a `160ms` fade.
- Suppress entrance audio in reduced-motion mode unless explicitly enabled.
- Pause optional idle effects when the tab is hidden.
- Apply `will-change` only while animation is active.
- Maintain readable contrast in Neutral, Warm, Cool, and High Contrast themes.
- Do not animate the background or character artwork continuously.

## Acceptance criteria

1. The Figma resting state remains visually unchanged.
2. All reusable components preserve Base, Theme, and Character layers.
3. Floating cards perform a real perspective `rotateY` entrance with `80ms` stagger.
4. Hover and press effects remain subtle and never shift layout.
5. Audio is synchronized, globally mutable, rate-limited, and safe under autoplay restrictions.
6. Replacing all character data, artwork, and theme variables produces a complete new character screen.
7. No character-specific copy, motif, or color is embedded in reusable component code.
