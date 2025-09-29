# UI & UX Guidelines – Hivemind Vertical Slice

## 1. Design System Overview

- **Base Reference:** Mirror `hivemind-waffleUI` tokens for color palette, typography scale, and iconography to maintain brand continuity.
- **Design Tokens:**
  - Colors: Primary (`hiveGold`), Secondary (`waffleBlue`), Neutral grayscale ramp, Alert states (success, warning, error) matching mock values.
  - Typography: Use `Inter` for UI, `Space Grotesk` for headings; weights 400/500/700.
  - Spacing: 4px base unit with 8px multiples for layout rhythm.
  - Elevation: Shadow tokens `elevation.sm/md/lg` for cards/dialogs.
- **Component Styling:** Adopt corner radius, border treatments, and icon sizes from mock library.

## 2. Layout & Responsive Behavior

- **Breakpoints:**
  - Mobile: ≤ 640px (primary target on Reddit mobile webview).
  - Tablet: 641–1024px.
  - Desktop: ≥ 1025px (Devvit companion web client).
- **Grid System:** 12-column fluid grid with max width 1280px on desktop; 4-column simplified grid on mobile.
- **Safe Areas:** Respect in-app browser safe zones; ensure critical controls have ≥ 16px padding from edges.
- **Responsive Patterns:**
  - Stack vertical on mobile, introduce split panes on desktop for feed/results.
  - Slider and Phaser canvas scale proportionally; maintain 16:9 min aspect ratio on wide screens.

## 3. Screen Guidelines

- **HomeScreen:**
  - Hero banner with call-to-action buttons (`Host Game`, `Join Game`).
  - Carousel or list preview of top active games; ensure 44px touch targets.
  - Use card elevation `md`, include host avatar placeholder.

- **HostView:**
  - Form layout with labeled fields (clue, duration selector). Inline validation using color tokens.
  - Progress indicator for draft→publish steps.
  - Primary action button anchored bottom for mobile with sticky footer.

- **GameFeed:**
  - List of cards with countdown timers; include host, clue snippet, participant count.
  - Timer uses `mono` font for readability; status chips color-coded.
  - Provide skeleton loaders during fetch.

- **GuessingView:**
  - Phaser slider centered, React wrapper for labels and median indicator.
  - Display live median with glowing indicator; include participant count and time remaining.
  - Justification text field below slider; enforce character counter.

- **ResultsView:**
  - Top section shows final target vs. median, highlight host score.
  - Cards for accolades with icons (`Psychic`, `Top Comment`, etc.).
  - Histogram chart using shared chart component; accessible color palette.
  - Share button prominent with copy-to-clipboard feedback.

## 4. Interaction Design

- **Slider Interaction:**
  - Drag handle responsive to pointer + touch input; include snap feedback when close to target.
  - Median update animation (smooth transition, 300ms) to convey live changes.
  - Provide haptic feedback cue on mobile (if device supports) via Phaser.

- **Forms & Inputs:**
  - Inline error messaging below fields; avoid modal dialogues for validation.
  - Primary CTA per screen; secondary actions as tertiary buttons or links.
  - Loading states with progress spinners or shimmer placeholders.

## 5. Accessibility Standards

- Adhere to WCAG 2.1 AA contrast ratios (check color tokens accordingly).
- Text scaling up to 200% without layout breaking; ensure relative units in CSS.
- Provide ARIA labels for interactive elements; slider must announce current value and median.
- Keyboard navigation: all focusable elements accessible via tab order, provide focus rings.
- Ensure live region updates for median changes (`aria-live="polite"`).

## 6. Component Library Organization

- **Atoms:** Buttons, badges, toggles, icons, input fields.
- **Molecules:** Game cards, countdown timer, slider wrapper, justification input group.
- **Organisms:** Feed list, host form, results summary panel.
- **Templates:** Screen layouts combining organisms with header/footer.
- Documentation stored in Storybook-like MDX (optional) for component references.

## 7. User Flows & Journey Maps

- **Host Flow:** Home → HostView (draft fetch) → Publish → GameFeed highlight.
- **Player Flow:** Home → GameFeed → GuessingView → ResultsView → Option to replay.
- Map out timing interactions (draft window, active countdown, reveal delay) with annotations.

## 8. Wireframes & References

- Use Figma document derived from `hivemind-waffleUI`; include mobile and desktop frames for each screen.
- Capture annotated screenshots detailing spacing, font sizes, component states.
- Maintain versioned link in README for design updates.

## 9. UI/UX Deliverables & Milestones

- Stage 1: Token catalog, layout grid specification, initial Home/Host wireframes.
- Stage 2: Feed and Guessing screen high-fidelity mocks, slider interaction specs.
- Stage 3: Results view design, animation guidelines, accessibility audit checklist.
- Stage 4: Responsive QA report, polish checklist (icons, microcopy, loading states).


