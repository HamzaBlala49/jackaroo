# Jackaroo Online — Board Geometry

## 1. Design goals

- One circular board that works identically for **4, 6 and 8** players.
- One normalized `1000 × 1000` SVG coordinate system.
- A single source of truth used by **both** the rules engine and the SVG renderer.
- Teammates visually opposite; no overlapping home lanes or bases.
- Clear protected cells, bases, home lanes and marbles at every supported count.
- Touch/mouse hit targets independent from the visual marble size.

## 2. Coordinate model

```ts
VIEWBOX = 0 0 1000 1000
CENTER  = (500, 500)
```

Screen angles use SVG's y-down convention:

```ts
x = cx + r * cos(θ)
y = cy + r * sin(θ)
θ_deg = 90 + index * (360 / 72)   // index 0 = bottom of the board, clockwise
```

- Ring index increases clockwise.
- Seat `i` starts at ring index `start_i = i * (72 / playerCount)`:
  - 4 players → starts `0, 18, 36, 54` (90° apart)
  - 6 players → starts `0, 12, 24, 36, 48, 60` (60° apart)
  - 8 players → starts `0, 9, 18, 27, 36, 45, 54, 63` (45° apart)
- Teammates are opposite seats because teams are assigned by seat parity.

## 3. Fixed dimensions

| Element | Value |
| --- | --- |
| ViewBox | 1000 × 1000 |
| Board outer disc | r = 494 (wood rim 462–494) |
| Inner felt | r = 462 |
| Main ring cell centers | r = 342 |
| Ring cells | 72, 30 × 30, rx 8 |
| Start cells | same cell footprint, 38 × 38 with team accent |
| Home lane slots | 4 per player, r = `292, 248, 204, 160` |
| Home slot size | 29 × 29 |
| Center medallion | r = 116 |
| Base dock center | r = 438 |
| Base dock | 78 × 66 rotated to face center |
| Base sockets | 2 × 2, spacing 22 |
| Seat anchor (DOM chips) | r = 380 (felt gap between base and ring) |

## 4. Seat station

For every seat:

```ts
startIndex = seat * (RING_LENGTH / playerCount);     // ring cell 0..71
startAngle = 90 + startIndex * 5;                    // degrees
lastRingIndex = (startIndex + RING_LENGTH - 1) % RING_LENGTH;
homeAngle = 90 + lastRingIndex * 5;                  // lane points inward from the cell before start
```

- **Base dock** is outside the ring at `startAngle`, centered at r = 438. It holds four socket positions in a 2 × 2 grid, rotated so its local “up” points toward the board center.
- **Start cell** is the ring cell at `startAngle`. It is protected and marked with the team color and an entry arrow.
- **Home gate** is the ring cell immediately counter-clockwise of the start cell (`lastRingIndex`). After a full lap (72 ring cells), a marble transitions inward from that cell into four home slots on the same radial line (`homeAngle`).
- **Home lane** runs from r = 292 to r = 160, ending just outside the center medallion (r = 116). Each player's lane is private and protected.
- **Seat anchor** for the HTML player chip is computed at the same angle at r = 380, in the felt gap between the base dock and the ring. On small screens the chips are replaced by the compact roster rail.

With 8 players, adjacent home lanes are 45° apart; at r = 160 that is ≈126 px of arc, far more than the 29 px slot width, so lanes never collide.

## 5. Routes and levels

```ts
routeLength = RING_LENGTH + HOME_LANE_LENGTH; // 76
progress 0..71  → ring cell (startIndex + progress) % 72
progress 72..75 → home slot progress-72
progress null   → base
```

- A marble's board cell is a pure function of its owner's seat and progress. This makes swap/progress mapping unambiguous and keeps the engine independent of pixel positions.
- The client derives `x, y` for rendering from the same `BoardModel`.
- Route preview/animations ask the board package for every cell center between two progresses (`getRoutePoints(seat, from, to)`), including the transition from the last ring cell into the home lane.

## 6. Safe cells

Always protected:

- Every player's start cell.
- Every home slot.
- Bases (by definition, no captures).

Additional neutral safe cells (configurable): ring indices **9, 27, 45, 63**.
Some coincide with start cells at 8 players; the renderer de-duplicates their visual marker.

A cell is **capturable** only if it is a ring cell, is not a start cell, is not a neutral safe cell, and no occupying marble is in a protected state.

## 7. Visual layers (SVG paint order)

1. Table/felt background (CSS outside the SVG).
2. Wooden board disc with beveled rim + engraved ring.
3. Inner felt.
4. Home lane wedges: team-tinted translucent lanes from ring to center.
5. Ring cells: dark ivory alternation, safe-star engraving, start-cell accents.
6. Home slots: team-colored glass insets.
7. Base docks: lacquered team plaques with 4 sockets and seat initials.
8. Center medallion: compass/logo, current-round indicator.
9. Destination highlights and legal-move halos (interactive layer).
10. Route preview dashes.
11. Marbles (glossy gradient + specular highlight + drop shadow).
12. Capture/impact transient effects.
13. Player DOM chips positioned outside/over the stage (not in SVG) for crisp text and avatar fidelity.

## 8. Player count adaptation

Only **seat count** changes; board radius and ring stay fixed. This avoids four different layouts and guarantees that rules/tests are uniform.

- 4 players: 18-cell gaps; large stations at bottom/left/top/right; roomy.
- 6 players: 12-cell gaps; stations every 60°.
- 8 players: 9-cell gaps; stations every 45°, compact roster chips and slightly smaller seat labels.

The SVG scales with CSS `width: 100%; aspect-ratio: 1`; overlays use percentages so every breakpoint stays aligned.

## 9. Marble stacking

- At most one cell can host multiple marbles.
- Marbles on the same cell are laid out on a deterministic rosette: sort by seat, then marble index, place on a circle of radius 9–12 px (with a slight z-order offset), size shrinks from r = 15 to r = 11 when > 2 share a cell.
- Home marbles sit centered in their home slot, four slots in a row.
- Base marbles sit in the dock's four sockets.
- Captured marbles animate from the capture cell back to their base socket.

## 10. Motion and the normalized model

- The layer animates `cx/cy` (or `transform`) between board-derived coordinates; it never animates raw rule data.
- For step-based moves, the client requests route points from the board package and tweens through them. Long moves are capped at ~700 ms with ease-out; a 7 split animates per confirmed segment.
- Board snapshots always take precedence: an interrupted animation snaps to the latest confirmed coordinates.
- Reduced motion collapses all durations to 0 ms.

## 11. Interaction

- Hit targets for marbles are 44 × 44 screen px (calculated via the SVG scale) even when the visual marble is 26 px.
- Legal destinations get a pulsing ring; hovering/focusing a marble previews its destination and path.
- Cards are keyboard-focusable with `Enter/Space`; selecting highlights legal marbles; Escape clears selection.
- The board is described with an `aria-label` and a visually hidden textual summary of the current turn; individual marbles expose accessible names.
- The board supports touch pan? No — the board is fixed and fully visible on every target viewport to avoid hidden gameplay information.

## 12. Performance constraints

- 72 ring cells + 4 × P home/base nodes are static per count and memoized. Only marbles, highlights and transient effects re-render during a move.
- No per-cell React subscriptions to the game store; the board shell subscribes to player-count, then marbles receive narrow selectors.
- SVG filters only on static wood/felt layers. Marble shadows use radial gradients rather than SVG `feDropShadow` on every move.
- DOM overlays are limited to ≤ 8 chips, the hand, and the activity panel.

## 13. Validation

Board geometry is covered by tests:

- Starts are unique, evenly spaced, and in range for 4/6/8.
- Safe cells include all starts and configured neutral cells.
- Route points are continuous and exactly `ringLength + homeLaneLength` long.
- Home lanes are inside the board and do not overlap any ring cell.
- Marbles always map to a valid normalized coordinate.
