# UI Polish: Tool Call Cards + Smooth Transitions

Upgrade the tool call card preview, thinking accordion, and overall message animations to feel premium and polished — while staying lightweight for low-end devices.

## Proposed Changes

### 1. Tool Call Card Redesign (`MessageBubble.jsx` + `styles.css`)

**Current state:** Tool calls render as a plain monospace text line: `seg-tool { font-size: 12.5px; color: var(--accent); }` — no background, no icon, no structure. Not expandable.

**Proposed:** A proper expandable mini-card:
- **Auto-closed (collapsed) by default** — shows only the tool icon + name in a compact header row
- Click to expand and reveal the arguments/details below
- A subtle glassmorphic background (`surface` + border)
- A small wrench/tool icon (pure CSS, no extra library)
- Tool name in bold on the header, arguments preview as muted text inside the expandable body
- Smooth CSS `max-height` slide transition on expand/collapse
- Gentle fade-in animation on appearance

---

### 2. Thinking Accordion Polish (`MessageBubble.jsx` + `styles.css`)

**Current state:** Plain `border-left` line, basic `>` / `▼` chevron, raw `<pre>` block. Always open during streaming.

**Proposed:**
- **Auto-open while actively streaming**, **auto-closed for historical messages** on page load
- A small animated sparkle icon next to "Thinking..."
- Smooth CSS `max-height` slide transition when opening/closing
- Subtle pulsing glow on the border while actively streaming
- Content inside rendered with slightly better typography (not raw `<pre>`)
- Same expandable card pattern as tool calls for visual consistency

---

### 3. Message Entry Animations (`styles.css`)

**Current state:** `msg-in` animation is a simple 180ms fade+translateY. Tool segments and reasoning blocks appear instantly with no animation.

**Proposed:**
- Staggered fade-in for segments inside a message (each segment fades in slightly after the previous)
- Smooth `opacity` + `translateY` for new segments appearing during streaming
- All animations use `transform` and `opacity` only (GPU-composited, zero layout thrash = perfect on low-end)

---

### 4. Low-End Device Safety

All animations will:
- Use only `transform` and `opacity` (GPU-composited properties)
- Use `will-change` sparingly and only where needed
- Use `contain: layout style` on message containers
- Respect `prefers-reduced-motion` — disable all animations for users who want that
- No `box-shadow` animations (expensive), only static shadows
- No JS-driven animations — everything is pure CSS transitions

## Files to Modify

#### [MODIFY] [MessageBubble.jsx](file:///home/xro/Desktop/Xro%20Agent/components/MessageBubble.jsx)
- Refactor `AccordionItem` into a unified expandable component used by both Thinking and Tool cards
- Tool calls use `AccordionItem` with `defaultOpen={false}` (auto-closed)
- Thinking uses `AccordionItem` with `defaultOpen={true}` during streaming, `defaultOpen={false}` for history
- Restructure `seg-tool` div into a proper card layout with icon + name + args inside the accordion body
- Add `seg-fade` animation class to new segments

#### [MODIFY] [styles.css](file:///home/xro/Desktop/Xro%20Agent/styles.css)
- Redesign `.seg-tool` into an expandable card with background, border, icon area
- Unify `.seg-reasoning` and `.seg-tool` into a shared expandable card style
- Add smooth `max-height` + `opacity` slide transition for expand/collapse
- Add `.seg-fade` keyframe for segment entry animation
- Add `@media (prefers-reduced-motion)` block
- Add subtle streaming pulse on active thinking border

## Verification Plan

### Manual Verification
- Open the UI, send a message to an AI model that uses tools → verify the new card looks premium
- Send a message to GLM/DeepSeek → verify the Thinking accordion opens/closes smoothly
- Test on a throttled CPU (Chrome DevTools → 4x slowdown) to verify no jank
