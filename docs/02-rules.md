# Jackaroo Online — Rulebook (v1 default)

> This is the project's explicitly defined default rule set. Jackaroo has many regional variants; this document is the contract for v1, not a claim that all Jackaroo tables play this way. Every rule that is configurable is marked **[config]**. Rules with a product decision called out are marked **[review]**.

## 1. Table and teams

- Supported table sizes: **4, 6, 8** players only.
- Players are seated evenly around a circular board. Seat order alternates teams, so teammates are diametrically opposite:
  - 4 players → 2 teams of 2.
  - 6 players → 3 teams of 2.
  - 8 players → 4 teams of 2.
- Seat index determines team: `teamId = seat % teamCount`. Team count is `playerCount / 2`. **[config]**
- Each player owns **4 marbles**. A team collectively has 8. **[config]**
- There is no elite/“king” player and no shared team hand; each player has their own hand and turn.

## 2. Board and movement path

- The board has a **72-cell shared ring** and a **4-slot private home lane** for every player. **[config: ringLength, homeLaneLength]**
- Each player has a unique start cell on the ring. Starts are equally spaced in seat order. **[config via board]**
- Movement runs **clockwise** in seat order. A marble's route is:
  `start → start+1 → … → start+71 (the cell just before start) → home 1 → home 2 → home 3 → home 4`.
- Positions are tracked as a route progress: `0..75` ring cells, then `72..75` home slots.
- Multiple marbles may occupy the same cell (own, teammate and opposing marbles). **[review]** Marbles are rendered in a small stack/rosette on the cell.
- Only the landing cell of a move triggers a capture; passing over a cell never captures.
- Marbles in a base, on a safe cell, or in a home lane cannot be captured or swapped.
- **Safe cells:** every player's start cell, four neutral “star” cells (ring indices 9, 27, 45, 63), and every home-lane slot. **[config: safePositions (additional neutral safe cells); starts and home lanes are always safe]** Starting safe cells can hold marbles from multiple teams without capture.
- A marble may share a safe cell with opponents harmlessly. Normal cells can also be shared after a non-capturing move? No: landing on an opponent on a normal cell captures (see §6), so co-occupancy on a normal cell arises only from the same team.

## 3. Cards

Standard 52-card deck, no jokers. **[config: deckSize]** Each player is dealt **4 cards** at the start of a round. **[config: cardsPerPlayer]** Card IDs are stable (`As`, `7h`, …).

Default card effects **[config: cardActions]**:

| Card | Default effect |
| --- | --- |
| **A** | Enter one of your marbles onto your start cell **or** move one eligible marble **1** or **11** steps forward. |
| **K** | Enter one of your marbles onto your start cell **or** move one eligible marble **13** steps forward. |
| **Q** | Move one eligible marble **12** steps forward. |
| **J** | Swap one of your eligible on-ring marbles with one opposing eligible on-ring marble. |
| **10** | Move **10** steps forward. |
| **9** | Move **9** steps forward. |
| **8** | Move **8** steps forward. |
| **7** | Split **up to 7** forward steps across one or more eligible marbles. |
| **6** | Move **6** steps forward. |
| **5** | Move **5** steps forward. The mover may choose **any eligible friendly marble** (“any-marble” choice). |
| **4** | Move one eligible marble **4** steps backward on the main ring. |
| **3** | Move **3** steps forward. |
| **2** | Move **2** steps forward. |

### Entering the board

- A marble in base can only enter with an **Ace or King**, placed directly on the owner’s start cell. **[config: enteringCards within cardActions]**
- Entering consumes the card and ends the turn. It does not additionally move 1/11/13.
- Entering is legal even if the start cell already contains marbles (own, ally or opponent).
- Opponents can never be captured on the start cell.

### Forward movement

- A card's full distance is applied in one segment (except 7).
- A marble may not finish past home slot 4. Home entry must be **exact** in the sense that the total distance lands exactly in a home slot; otherwise the move is illegal. **[config: exactHomeEntry]**
- A marble in home may only move forward, never backward.

### Backward movement (4)

- Moves exactly 4 positions backward along the **owner-relative ring**.
- Legal only if the marble is on the ring (progress ≥ 4) and its destination remains on the ring. A 4 cannot push a marble below its start/base and cannot be used in a home lane. **[config: backwardInHomeLane, allowWrapBackward]**
- Backward moves can cause captures under the normal landing rules. **[review]**
- The 4 card cannot be split or used to enter.

### Seven

- Playing a 7 places the game in a “seven in progress” phase. The player then distributes steps one segment at a time.
- Each segment is a forward move of 1–remaining steps by one eligible marble. Each segment must be individually legal (including exact home entry).
- The total may not exceed 7. The player may end the turn early with unused steps (they are forfeited). At least one step must be taken.
- Captures and home entries apply after each segment. A team win ends the game immediately, even mid-split.
- The UI shows 7 pips, used/remaining, and a per-marble maximum for the next segment. The server broadcasts each confirmed segment.
- Moving multiple different marbles, or the same marble more than once, is allowed. **[review: unused steps]**
- If the player finishes their last marble during the split, any unused steps are forfeited and assistance does not begin until their next turn. **[review]**

### Jack swap

- Choose one of your eligible marbles and one opponent's eligible marble. They exchange **physical cells**, not progress indices. Each swapped marble's owner-relative progress is recalculated from its new cell.
- Both marbles must be on the main ring and both source/destination cells must be unprotected. Base and home marbles are ineligible. Teammates are not opponents.
- A swapped marble may land on any unprotected ring cell, including a cell occupied by other marbles. No capture occurs from a swap; stacks are allowed.
- The swap is illegal if either marble is on a start, a neutral safe cell, or a home lane.
- “Your eligible marble” includes a teammate's marble only when assistance applies (see §8).

## 4. Turn structure

- The starting seat of round 1 is seat 0 (the host/first joined seat). **[config: startingSeat]**
- Turn order is seat order (clockwise), skipping players who have emptied their hand for the round or who are out of the rotation.
- On a turn the player must play exactly one card, then the turn passes.
- **No voluntary discard:** if at least one card in hand has a legal action, the player must play one of those actions and cannot discard. This keeps the declared rule “when a player has no legal move, they must discard and pass.” **[review]**
- **Forced pass:** if no card in hand has any legal action, the player chooses one card to discard face-up and the turn passes. The server verifies that no legal action existed for any card.
- A play that produces no movement (e.g. a swap) still consumes the card and passes the turn.
- A 7 keeps the turn until the player ends it, reaches 7 steps, or the game ends.

## 5. Round and deck flow

1. Shuffle a standard 52-card deck with a server-generated cryptographic seed. **[config: deck handling]**
2. Deal 4 cards to each player.
3. Players take their turns.
4. When every player in the rotation has played all four cards:
   - Collect **all 52 cards** (played cards, forced discards, undealt remainder) and shuffle them server-side. This is the explicit v1 interpretation of “shuffle the discard pile into a new deck.” **[review]**
   - Deal 4 new cards to each player.
   - Rotate the starting seat forward by one seat (`+1 mod playerCount`).
   - Round number increments.
5. The server never lets a client influence the shuffle, deal or order.

## 6. Capturing

- Landing on a cell occupied by one or more **opponents** on a normal ring cell sends **all opposing marbles on that landing cell** back to their owners' bases. **[review: multi-occupancy capture]**
- Marbles belonging to the mover or their teammate are never captured; stacks are allowed.
- Safe cells, home lanes and bases are capture-immune.
- Entering a start cell never captures (starts are safe).
- Captures update per-player statistics (`captures`).
- A captured marble's progress resets to base; it must re-enter with an Ace/King (unless a later home-lane rule allows otherwise — it does not in v1).

## 7. Home entry and finishing a player

- Home lane slots are entered only in order: 1 → 2 → 3 → 4.
- A move that would end past slot 4 is illegal.
- A marble in the final home slot is “home” and can never move again.
- A player is **finished** when all 4 of their marbles are home.
- Finishing does not end the match unless the team also has its 8 marbles home.
- The team wins the moment all 8 team marbles are home. The match ends immediately, including mid-split. **[config: allowTeamAssistance does not affect win]**

## 8. Team assistance

- Once a player has all four marbles home, on their subsequent turns they may use their hand to move **their teammate's remaining marbles**, including entering the teammate's marbles from base with an Ace/King. **[config: allowTeamAssistance; assistFromBase]**
- Before finishing, a player may only move their own marbles. A teammate cannot move your marbles while you are still playing.
- The assisted player still takes their own turns normally. There is no shared hand.
- If assistance is disabled, a finished player leaves the rotation; their remaining cards are discarded and their team can only finish through the other teammate. The match still ends when both teammates' eight marbles are home.
- If both teammates are finished, the team has won; no further turns occur.

## 9. Winning

- The winner is the first team with all 8 marbles in their home lanes.
- One winner only; the match ends immediately. No tie-break.
- The results screen reports winning team, players, duration, total moves, captures, cards played, per-player marbles home and moves.
- The host can rematch in the same room; other players return to the lobby.
- Match results are durable in PostgreSQL and lifetime statistics update for every participant.

## 10. Disconnects and timing

- A disconnected active player keeps their seat and cards. The match does not restart.
- Play cannot proceed on a disconnected player's turn without them (no bots, no auto-moves). Reconnection restores the state. Rooms expire after 24 h of inactivity; an abandoned match can be marked abandoned.
- Waiting-room disconnects release the seat after a 20 s grace window; a host disconnect migrates host to the next connected player.
- Turn timers are **not enabled in v1**. The board may show elapsed turn time, but no autoplay occurs. A future configurable timer must define a deterministic autoplay policy before being enabled. **[config: turnTimerSeconds — reserved]**

## 11. Configuration and regional variations

`JackarooRules` centralizes all defaults. Initial shape (extended as implementation required):

```ts
interface JackarooRules {
  version: string;
  playerCounts: [4, 6, 8];
  marblesPerPlayer: 4;
  playersPerTeam: 2;
  deckSize: 52;
  cardsPerPlayer: 4;
  allowTeamAssistance: true;
  exactHomeEntry: true;
  cardActions: Record<Rank, CardActionConfig>;
  safePositions: number[];            // additional neutral safe ring cells
  board: {
    ringLength: 72;
    homeLaneLength: 4;
    starts: "even-seat-order";
  };
  capture: {
    scope: "all-on-landing-cell";
    backwardsCaptures: true;
  };
  seven: {
    maxSteps: 7;
    requireFullUse: false;
    allowSameMarbleAgain: true;
  };
  discard: {
    voluntary: false;
    fullDeckReshuffle: true;
  };
  assistance: {
    fromBase: true;
    beginsNextTurnAfterFinish: true;
  };
}
```

### Known regional variations (deliberately not enabled)

- Jokers / wild cards, or a larger deck.
- Aces/face cards entering rather than moving; different numeric values.
- 5 “any marble” implying you may move an opponent's marble or a marble regardless of ownership.
- 7 splitting in any direction, or combining with backward movement.
- Jack swapping with teammates or protected marbles, or stealing a marble rather than swapping.
- Non-exact home entry (bounce/overshoot rules).
- Multiple win conditions (e.g. all marbles home vs. one marble).
- Shared team hands, partner consultation, or simultaneous turns.
- Turn timers with autoplay.
- Different safe-square maps and “killer” squares.

These are isolated behind config/types so a later “house rules” feature can add presets without rewriting the engine.

## 12. Open decisions flagged for review before production

These defaults are implemented but are the most likely places a regional group will disagree:

1. **Multi-occupancy:** stacking is allowed; capture clears all opposing marbles on the landing cell.
2. **Seven:** unused steps may be forfeited; a 7 can move the same marble repeatedly; finishing mid-7 forfeits the rest.
3. **Four:** backward captures are allowed; no backward movement in home lanes or below route index 0.
4. **Discard:** no voluntary discard when a legal action exists.
5. **Assistance:** begins on the helper's next turn, can enter from base, and a finished player still holds/plays their own hand.
6. **Reshuffle:** all 52 cards are reshuffled after each round, not only cards in the discard pile.
7. **Jack:** swaps physical ring cells and can create stacks; no capture.
8. **Start stacking:** entering may stack on an occupied start cell.
9. **No turn timer:** an absent player stalls the match rather than triggering bot-like autoplay.
10. **No spectator mode** in v1.

All ten are documented in-app (Rules → “House rules” and match rules dialog) so players know the table rules before joining.
