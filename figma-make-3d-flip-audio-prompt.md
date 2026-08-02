# Figma Make Prompt: Reusable 3D Card Motion and Audio

Use the attached Figma gacha screen as the visual source of truth. Preserve its current composition, typography, spacing, poster artwork, transparent large character-name typography, and black/white editorial UI. Do not redesign the page and do not create a Marx-specific component.

Build a reusable implementation for any character using React, TypeScript, and CSS. Create a generic `FloatingGachaPanel` component and use it for:

- character identity panel
- event / pity information panel
- gacha action panel

## Reusability

The component must accept data and theme props instead of embedding character-specific visuals:

```ts
type CharacterTheme = {
  accentPrimary: string;
  accentSecondary?: string;
  paper: string;
  ink: string;
  onInk: string;
};

type FloatingGachaPanelProps = {
  children: React.ReactNode;
  theme: CharacterTheme;
  motionDelay?: number;
  soundTier?: "standard" | "rare" | "silent";
  className?: string;
};
```

Do not hardcode red, stars, chains, revolutionary symbols, Marx text, or any character-specific motif inside the component. Character identity must come only from props, artwork slots, theme variables, and content.

## True 3D entrance

Implement a real perspective flip, not a 2D scale-only imitation:

- parent perspective: `1000px`
- `transform-style: preserve-3d`
- start: `rotateY(-78deg) translateY(28px) scale(0.92)`
- optional slight `rotateZ(-2deg)`
- settle: `rotateY(0deg) translateY(0) scale(1)`
- duration: `620ms`
- easing: `cubic-bezier(.18,.82,.24,1)`
- opacity: `0 -> 1` during the first 280ms
- blur: `10px -> 0` before the settle point
- overshoot once to `scaleX(1.03)`, then settle without bounce
- `backface-visibility: hidden`

Create a neutral reusable back face using grayscale paper texture, index marks, grid fragments, and generic archive typography. It must not contain a character color or symbol.

Match the Figma timing:

- character identity panel delay: `0ms`
- event / pity panel delay: `120ms`
- gacha action panel delay: `220ms`

After entrance, allow only a subtle idle float of 2-3px over 3.6 seconds. Stop the idle animation while the user hovers, focuses, presses, or has reduced motion enabled.

## Interaction

- Hover: perspective tilt no greater than 3 degrees.
- Press: return toward a flat plane and scale to `0.97`.
- Focus-visible: use a clear neutral focus indicator that does not depend on character color.
- Do not let animation change layout dimensions.
- Do not animate the background poster.

## Audio

Add an opt-in, reusable sound system:

- at approximately 40% of the flip: short paper-card flick
- at settle: restrained mechanical latch
- for `soundTier="rare"`: add a brief high-frequency glass/metal chime
- do not play audio on ordinary hover
- default master volume: 0.35
- provide a persistent mute toggle
- preload audio after the first user interaction
- handle browser autoplay restrictions
- never overlap repeated entrance sounds uncontrollably

Prefer procedurally generated Web Audio sounds using filtered noise and short oscillator envelopes so the prototype has no copyrighted audio dependency. Keep the sound engine replaceable with local audio assets later.

## Accessibility and performance

- Respect `prefers-reduced-motion: reduce`: replace the flip with a 160ms fade.
- When reduced motion is active, suppress entrance sound unless the user explicitly enables it.
- Pause idle motion when the tab is hidden.
- Use `will-change: transform, opacity, filter` only during active animation.
- Ensure keyboard activation works for interactive panels and buttons.
- Maintain readable contrast for every character theme.
- Use CSS custom properties for theme values.

## Acceptance criteria

1. The current Figma resting state remains visually unchanged.
2. Panels perform a real perspective `rotateY` flip.
3. The three panels enter in the specified staggered sequence.
4. Motion never shifts surrounding layout.
5. Sound is synchronized, muted by default until interaction is allowed, and can be disabled.
6. Replacing all character data and theme values produces a valid new character screen without editing component CSS.
7. No Marx-specific visual or copy exists inside reusable component code.

Return the working interactive screen as the first view, not a landing page or feature explanation.
