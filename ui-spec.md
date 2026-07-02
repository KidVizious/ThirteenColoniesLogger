# 13 Colonies Ham Radio Event Logger — UI Design Specification

---

## 1. Overall Layout Architecture

The app uses a **fixed three-zone layout** — nothing is hidden, nothing scrolls the outer shell. Every critical piece of information is visible at once. This is a logging application: speed and situational awareness trump everything else.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOOLBAR / HEADER                                                            │
│  Title · Callsign · Event Status · QSO Count · Export · Settings · Theme   │
├──────────────────────────┬──────────────────────────────────────────────────┤
│                          │                                                   │
│   CONTACT ENTRY PANEL    │        SWEEP STATUS / PROGRESS TRACKER           │
│   (left column, ~360px)  │        (right column, fills remaining width)     │
│                          │                                                   │
│   Callsign               │   ┌─ Progress Summary ─────────────────────┐    │
│   Band | Mode            │   │  11/13 Colonies · 2/3 Bonus · Sweep %  │    │
│   Sent RST | Rcvd RST    │   └────────────────────────────────────────┘    │
│   Their QTH              │   ┌─ Station Grid ──────────────────────────┐   │
│   Notes                  │   │  [K2A][K2B][K2C][K2D][K2E][K2F][K2G]  │   │
│   UTC Timestamp          │   │  [K2H][K2I][K2J][K2K][K2L][K2M]        │   │
│   [LOG IT]               │   │  [WM3PEN][GB13COL][TM13COL]             │   │
│                          │   └────────────────────────────────────────┘    │
│   ── Band/Mode Matrix ── │   ┌─ Band/Mode Overview ────────────────────┐   │
│   (compact table below   │   │  rows=bands, cols=modes, cell=count     │   │
│    the entry form)       │   └────────────────────────────────────────┘    │
│                          │                                                   │
├──────────────────────────┴──────────────────────────────────────────────────┤
│                                                                               │
│   QSO LOG LIST   (bottom panel, ~260px, scrollable)                          │
│   # · Time · Call · Colony/Name · Band · Mode · Sent · Rcvd · QTH · Notes  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Minimum window size:** 1024 × 720px
**Recommended:** 1280 × 800px and above
**Layout engine:** CSS Grid with three named regions: `header`, `main`, `loglist`. The `main` area splits into a fixed-width left column and a fluid right column using a nested grid.

---

## 2. Color Palette

### Design Philosophy
Deep navy as the dominant tone — it reads as both "professional logger software" and carries the colonial/patriotic resonance without waving a flag. Parchment gold acts as the primary accent, used sparingly so it retains impact. Colonial red is reserved for warnings and critical states only — not decorative.

### Dark Theme (Primary)

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0D1117` | App background, deepest layer |
| `--bg-surface` | `#161C26` | Panel backgrounds, cards |
| `--bg-elevated` | `#1E2733` | Input fields, table rows hover |
| `--bg-overlay` | `#253040` | Modals, tooltips, dropdown menus |
| `--border-subtle` | `#2A3547` | Panel dividers, card borders |
| `--border-default` | `#3D4F68` | Input borders, table lines |
| `--border-focus` | `#6B8FBF` | Focused input rings |
| `--text-primary` | `#E8E6E0` | Primary body text — warm white, not pure |
| `--text-secondary` | `#8A97A8` | Labels, secondary info |
| `--text-muted` | `#536070` | Placeholder text, disabled states |
| `--text-inverse` | `#0D1117` | Text on bright/gold backgrounds |
| `--accent-gold` | `#C9A84C` | Primary accent — parchment gold |
| `--accent-gold-bright` | `#E8C060` | Gold hover/active states |
| `--accent-gold-dim` | `#7A6232` | Gold at low opacity contexts |
| `--accent-navy` | `#1E3A5F` | Navy accent for structural highlights |
| `--accent-navy-bright` | `#2B5282` | Navy hover |
| `--state-worked` | `#2D6A4F` | Worked station background |
| `--state-worked-border` | `#40916C` | Worked station border |
| `--state-worked-text` | `#95D5B2` | Worked station callsign text |
| `--state-bonus` | `#7A5C00` | Bonus station background (worked) |
| `--state-bonus-border` | `#C9A84C` | Bonus station border |
| `--state-needed` | `#1E2733` | Unworked station background |
| `--state-dupe` | `#5C1A1A` | Dupe warning background |
| `--state-dupe-border` | `#B83232` | Dupe warning border |
| `--state-dupe-text` | `#F08080` | Dupe warning text |
| `--btn-primary-bg` | `#C9A84C` | Log It button background |
| `--btn-primary-text` | `#0D1117` | Log It button text |
| `--btn-primary-hover` | `#E8C060` | Log It button hover |
| `--progress-track` | `#1E2733` | Progress bar background |
| `--progress-fill` | `#2D6A4F` | Progress bar fill — colonies |
| `--progress-bonus` | `#C9A84C` | Progress bar fill — bonus overlay |

### Light Theme

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#F5F2EC` | App background — warm parchment tint |
| `--bg-surface` | `#FDFBF7` | Panel backgrounds |
| `--bg-elevated` | `#FFFFFF` | Input fields, elevated cards |
| `--bg-overlay` | `#F0EDE5` | Modals, hover states |
| `--border-subtle` | `#DDD8CE` | Panel dividers |
| `--border-default` | `#C4BDB0` | Input borders |
| `--border-focus` | `#2B5282` | Focused input rings |
| `--text-primary` | `#1A1E26` | Primary body text |
| `--text-secondary` | `#5A6070` | Labels, secondary |
| `--text-muted` | `#96A0AE` | Placeholders, disabled |
| `--text-inverse` | `#FDFBF7` | Text on dark backgrounds |
| `--accent-gold` | `#A0782A` | Gold — darker for contrast on light |
| `--accent-gold-bright` | `#C9962E` | Gold hover |
| `--accent-gold-dim` | `#DEB96A` | Gold muted |
| `--accent-navy` | `#1E3A5F` | Navy — same as dark theme |
| `--state-worked` | `#D1FAE5` | Worked station background |
| `--state-worked-border` | `#34D399` | Worked border |
| `--state-worked-text` | `#065F46` | Worked text |
| `--state-bonus` | `#FEF3C7` | Bonus worked background |
| `--state-bonus-border` | `#F59E0B` | Bonus border |
| `--state-needed` | `#EEE9E0` | Unworked station |
| `--state-dupe` | `#FEE2E2` | Dupe background |
| `--state-dupe-border` | `#F87171` | Dupe border |
| `--state-dupe-text` | `#991B1B` | Dupe text |
| `--btn-primary-bg` | `#1E3A5F` | Log It button — navy on light |
| `--btn-primary-text` | `#FDFBF7` | Log It button text |
| `--btn-primary-hover` | `#2B5282` | Log It hover |

---

## 3. Typography

### Rationale
Ham radio logging is precision work — the typography must read cleanly at small sizes and under stress. But this is also a celebration of an annual event with historical character. The font choices thread that needle: a geometric display face for headers that carries gravitas, a highly-legible monospace for callsigns and RST values (essential for distinguishing O/0, I/1/l), and a clean but distinctive text face for UI labels.

### Font Stack

**Display / App Title / Headers**
- **`Libre Baskerville`** — A refined serif with sturdy presence. Evokes printed colonial documents without being costume-y. Use for the app title, panel headers, sweep completion messages.
- Fallback: `Georgia, serif`
- Load via: Google Fonts or bundle as local variable font

**UI Text / Labels / Buttons**
- **`DM Sans`** — Clean, slightly geometric, excellent small-size legibility. Not as ubiquitous as Inter. Distinct enough to feel intentional, neutral enough not to fight with Baskerville.
- Fallback: `system-ui, sans-serif`
- Weights: 400, 500, 600

**Callsigns / RST / Frequency Data / Log Table**
- **`JetBrains Mono`** — The best general-purpose coding mono for this task. Characters are highly differentiated, spacing is generous, it's beautiful at 12–14px. Critical for callsign entry (zero vs O, one vs I vs l).
- Fallback: `Consolas, Courier New, monospace`
- Weights: 400, 600
- Use: Callsign input field, callsign column in log, RST fields, UTC timestamp, band/mode matrix values

### Type Scale

| Level | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `app-title` | Libre Baskerville | 18px | 700 | Toolbar app name |
| `panel-header` | DM Sans | 11px | 600 | Panel section labels (uppercase, 0.08em tracking) |
| `label` | DM Sans | 12px | 500 | Form field labels |
| `input` | JetBrains Mono | 14px | 400 | All input fields |
| `callsign-large` | JetBrains Mono | 22px | 600 | Callsign tile in status grid |
| `colony-name` | DM Sans | 11px | 500 | Colony name under callsign in tile |
| `body` | DM Sans | 13px | 400 | General UI text |
| `table-cell` | JetBrains Mono | 12px | 400 | Log table rows |
| `table-header` | DM Sans | 11px | 600 | Log table column headers (uppercase) |
| `badge` | DM Sans | 10px | 700 | QSO count badge, "DUPE", "WORKED" badges |
| `matrix-cell` | JetBrains Mono | 11px | 400 | Band/mode matrix values |
| `progress-label` | DM Sans | 13px | 600 | "11 / 13 Colonies" text |

---

## 4. Component Hierarchy

```
App
├── ThemeProvider (injects CSS variables based on theme state)
├── AppShell (CSS Grid: header / main / loglist)
│   ├── Toolbar
│   │   ├── AppTitle ("13 Colonies Event Logger")
│   │   ├── EventStatusBadge
│   │   ├── OperatorCallsign
│   │   ├── QSOCountBadge
│   │   └── ToolbarActions
│   │       ├── ExportButton
│   │       ├── SettingsButton
│   │       └── ThemeToggle
│   │
│   ├── MainArea (CSS Grid: entry-col / tracker-col)
│   │   ├── EntryColumn (left, fixed ~360px)
│   │   │   ├── ContactEntryForm
│   │   │   │   ├── CallsignField (with DupeIndicator, ColonyLabel)
│   │   │   │   ├── BandModeRow
│   │   │   │   │   ├── BandSelector (segmented buttons)
│   │   │   │   │   └── ModeSelector (segmented buttons)
│   │   │   │   ├── RSTRow
│   │   │   │   │   ├── SentRSTField
│   │   │   │   │   └── RcvdRSTField
│   │   │   │   ├── QTHField
│   │   │   │   ├── NotesField
│   │   │   │   ├── UTCTimestampDisplay (click-to-edit)
│   │   │   │   └── LogItButton
│   │   │   └── BandModeMatrix (compact, below form)
│   │   │
│   │   └── TrackerColumn (right, fluid)
│   │       ├── SweepProgressSummary
│   │       │   ├── ColonyProgressIndicator
│   │       │   ├── BonusProgressIndicator
│   │       │   ├── NeededList
│   │       │   └── SweepAchievements (trophy icons)
│   │       └── StationGrid
│   │           ├── ColonyStationTile × 13 (K2A–K2M)
│   │           │   ├── Callsign
│   │           │   ├── ColonyName
│   │           │   ├── WorkedIndicator
│   │           │   └── BandModePips (hover-expanded matrix)
│   │           └── BonusStationTile × 3
│   │               ├── Callsign
│   │               ├── BonusName
│   │               ├── BonusCountry flag or icon
│   │               └── WorkedIndicator
│   │
│   └── LogListPanel (bottom, fixed ~260px)
│       ├── LogListHeader (column headers + filter/sort controls)
│       └── LogListTable (virtualized rows)
│           └── LogRow × N
│               ├── (all QSO fields)
│               └── RowActions (edit, delete — appear on hover)
│
├── SettingsModal
│   ├── OperatorSection
│   ├── DefaultsSection
│   └── AppearanceSection
│
└── ConfirmDeleteModal
```

---

## 5. Panel-by-Panel Specification

---

### 5A. Toolbar / Header

**Height:** 48px
**Background:** `--bg-surface` with a 1px bottom border in `--border-subtle`

Left to right layout:
- **App icon** (16×16px) — A small 13-star Betsy Ross circle rendered as a minimal geometric SVG. Not photorealistic, just 13 dots arranged in a circle. Color: `--accent-gold`.
- **App Title** `13 Colonies Event Logger` — Libre Baskerville, 18px, `--text-primary`
- **Separator** (1px vertical, `--border-subtle`)
- **Event Status Badge** — pill-shaped badge:
  - Pre-event: `"July 1–7"` in `--text-secondary`
  - During event: `"EVENT ACTIVE"` with a soft green pulse animation (CSS `@keyframes pulse` on the left-side dot indicator)
  - Post-event: `"Event Ended"` muted
- **Spacer** (flex-grow)
- **Operator callsign** — `W1XYZ` in JetBrains Mono 13px, prefixed by a muted `"OP:"` label in DM Sans. Clicking this opens Settings focused on the callsign field.
- **QSO Count Badge** — circular badge with number. Background `--accent-navy`, text `--accent-gold`, DM Sans 11px bold. Shows total logged count.
- **Export ADIF** — text button with `↓` icon. Hover: underline + gold text color.
- **Settings** — gear icon (20×20px SVG). Hover: rotate 30deg over 200ms.
- **Theme Toggle** — sun icon (light mode) / moon icon (dark mode). Toggle with a 150ms opacity crossfade.

---

### 5B. Contact Entry Panel (Left Column)

**Width:** 360px fixed
**Background:** `--bg-surface`
**Right border:** 1px `--border-subtle`
**Internal padding:** 16px

#### Panel Header
"CONTACT ENTRY" — DM Sans 11px 600 uppercase, `--text-secondary`, 8px tracking. 12px bottom margin.

---

#### Callsign Field

**Label:** `CALLSIGN` — 11px label above
**Input:** Full width, JetBrains Mono 14px, height 40px, `--bg-elevated` background, `--border-default` border, 4px border-radius.

Behaviors:
- `text-transform: uppercase` via CSS — the input value auto-uppercases as typed.
- On change, validate against the 16 known stations. If match:
  - Show **colony label** below the field: `"→ New York (Colony 1)"` in DM Sans 12px `--accent-gold`. Appears with a 100ms fade-in.
  - Pre-fill the QTH field with the state/country.
- **Dupe detection:** After callsign + band + mode are all set, check against log. If dupe:
  - Callsign field border becomes `--state-dupe-border`
  - Background becomes `--state-dupe` (subtle)
  - A `DUPE` badge appears inline at the right side of the input field — DM Sans 10px bold, red pill badge
  - Animation: the badge slides in from the right over 120ms with `translateX(8px) → 0` + fade in
  - A small helper text below: `"Already logged on 20m SSB"` in `--state-dupe-text` 11px
  - This is **non-blocking** — the operator can still tab forward and log it

**Tab index:** 1

---

#### Band Selector

**Label:** `BAND` — 11px above
Rendered as **segmented button group** (not a dropdown — dropdowns require two actions; buttons allow muscle memory).

Buttons arranged in two rows to avoid overflow:
- Row 1 (most common in event): `20m · 40m · 15m · 10m · 17m`
- Row 2 (less common): `80m · 160m · 30m · 12m · 6m · 2m`

Each segment: DM Sans 12px, height 30px, `--bg-elevated` background, `--border-default` border, no radius on inner edges.
**Selected state:** `--accent-navy` background, `--accent-gold` text, `--accent-gold` border.
**Hover:** `--bg-overlay` background.

**Tab index:** 2

---

#### Mode Selector

**Label:** `MODE` — 11px above
Segmented buttons in one row: `SSB · CW · RTTY · FT8 · FT4 · DIG`

Same styling as Band. Default selection restores from last-used or settings default.

**Tab index:** 3

**Mode → RST auto-fill logic:**
- SSB selected → pre-fill Sent RST to `59`, Rcvd RST to `59`
- CW selected → pre-fill to `599` / `599`
- RTTY/Digital selected → pre-fill to `599` / `599`
- These are immediately editable — the pre-fill is just a starting point

---

#### RST Row

Two fields side by side, 50/50 split with 8px gap.

**Left — Sent RST:**
Label: `SENT RST`
Input: JetBrains Mono 14px, width ~100%, max-length 3 chars. Auto-selected when tabbed to (so the operator can type over without backspacing).
**Tab index:** 4

**Right — Rcvd RST:**
Label: `RCVD RST`
Same input style.
**Tab index:** 5

---

#### QTH Field

**Label:** `THEIR STATE / COUNTRY`
Input: JetBrains Mono 14px. Auto-populated when a colony callsign is recognized.
For unrecognized callsigns, operator types manually (e.g., `OH`, `ON`, `G`, `NY`).
**Tab index:** 6

---

#### Notes Field

**Label:** `NOTES (optional)`
Textarea: 2 rows, DM Sans 13px, `--bg-elevated`, resize-none. Very low visual priority.
**Tab index:** 7

---

#### UTC Timestamp Display

Not in tab order. Displayed as a read-only styled field below the Notes field.

Design: A small row with a clock icon (14px), the current UTC time in JetBrains Mono `HH:MM:SS UTC`, and date in DM Sans. This ticks live (updates every second via JS interval).

On click: the time field becomes editable — input transforms in place, no modal. A small `(editing)` indicator appears. On blur or Enter, time is locked. This is for the rare case where the operator is logging a QSO retroactively.

Visual treatment: Lighter background, 1px dashed border in `--border-subtle`. Clearly read-only by default — not mistaken for a data entry field.

---

#### Log It Button

Full width, height 44px. `--btn-primary-bg` background, `--btn-primary-text` text.
Libre Baskerville 15px, letter-spacing 0.05em. Text: `LOG IT`

**Hover state:** `--btn-primary-hover` background, scale(1.01) transform over 100ms.
**Active/press state:** scale(0.98), background darkens slightly.
**Keyboard:** Pressing Enter while the Notes field is focused triggers this button. Pressing Enter while the Callsign field is focused also triggers it.

**Tab index:** 8

After logging:
- Button briefly shows a checkmark `✓ LOGGED` for 800ms (text swap, no color change)
- Callsign field is cleared and focused (ready for next QSO)
- Band and Mode retain their last values (they rarely change between QSOs)
- RST fields revert to the mode-appropriate defaults

---

#### Band/Mode Matrix (below entry form)

**Panel sub-header:** `BAND / MODE OVERVIEW` — same label style as above

A compact grid table. Rows = bands (160m down to 2m). Columns = modes (SSB, CW, RTTY, FT8, DIG).

Each cell shows a number like `7` or `7/13` depending on available space. Tooltip on hover shows the full count and which stations are still needed.

Cell color states:
- **0 worked:** `--bg-elevated`, `--text-muted` text (shows `·` instead of `0`)
- **1–12 worked:** `--state-bonus` (amber-ish) — partial
- **13/13 worked:** `--state-worked` — green — band+mode sweep complete

This is dense information displayed at roughly 12×12px cells per entry. The table header row and column use DM Sans 10px uppercase. Values use JetBrains Mono 11px.

---

### 5C. Sweep Status / Progress Tracker (Right Column)

**Width:** Fluid (fills remaining space after 360px left column)
**Background:** `--bg-base`
**Padding:** 16px

---

#### Sweep Progress Summary (top of right column)

A horizontal bar/banner. Height ~72px.

**Left side — Colony progress:**
```
COLONIES    ████████████░░  11 / 13
```
- Label: `COLONIES` in DM Sans 11px uppercase muted
- Progress bar: full width of its container, height 8px, rounded, `--progress-track` background, `--progress-fill` fill. The fill animates width when a new station is worked (CSS transition `width 400ms cubic-bezier(0.34, 1.56, 0.64, 1)` — a gentle overshoot spring).
- Count: `11 / 13` in DM Sans 14px 600 `--text-primary`

**Right side — Bonus progress:**
```
BONUS       ██░  2 / 3
```
Same treatment but amber/gold progress fill.

**Bottom row — achievement indicators** (three trophy-style marks):
- `[ 13 COLONIES SWEEP ]` — unlocks when all 13 worked. Initially a dashed outline, fills gold when achieved.
- `[ + WM3PEN ]` — unlocks when WM3PEN also worked.
- `[ FULL SWEEP ]` — unlocks when all 16 worked.

Each is a small pill badge ~90px wide. Unachieved: 1px dashed border, muted text. Achieved: solid gold background, dark text, plus a subtle gold shimmer animation that plays once when it unlocks (`@keyframes shimmer` using a linear-gradient moving across the badge over 600ms).

**Needed stations callout:**
`Need for sweep: K2C · K2G` — DM Sans 12px, `--accent-gold` color. If all are worked, reads `"Full Sweep Achieved!"`.

---

#### Station Grid

Below the summary, the main visual centerpiece.

**Layout:** CSS Grid, `grid-template-columns: repeat(auto-fill, minmax(110px, 1fr))`, max 7 per row. The 13 colonies fill two rows, bonus stations fill a third row (visually separated by an 8px gap and a `BONUS STATIONS` section label).

**Colony Tile — Unworked state:**
```
┌────────────────┐
│  K2A        #1 │
│  New York      │
│  ─ ─ ─ ─ ─    │  ← empty band/mode pips
└────────────────┘
```
- Border: 1px `--border-subtle`
- Background: `--state-needed`
- Callsign: JetBrains Mono 18px 600, `--text-secondary`
- Colony name: DM Sans 11px, `--text-muted`
- Number indicator: `#1` in top-right corner, 10px, muted (colony number in historical order)

**Colony Tile — Worked state:**
```
┌────────────────┐
│ ✓ K2A       #1 │
│   New York     │
│  ● ○ ○ ○ ○    │  ← band/mode pips (● = worked that combo)
└────────────────┘
```
- Border: 1px `--state-worked-border`
- Background: `--state-worked`
- Callsign: JetBrains Mono 18px 600, `--state-worked-text`
- **Band/mode pips:** Five small 6×6px circles representing (SSB, CW, RTTY, FT8, DIG). Filled = worked on that mode. Displayed in a row at the bottom of the tile. Tooltip on hover lists specifics.

**Transition on first work:** When a station is logged for the first time:
1. Tile border and background transition from neutral to green over 300ms
2. Brief scale-up pulse: `scale(1) → scale(1.06) → scale(1)` over 400ms with easing
3. If this completes the 13-colony sweep, the entire grid rows flash a subtle gold shimmer once (sequential, 50ms delay between tiles)

**Bonus Station Tiles:** Same layout but:
- Unworked border uses `--accent-gold-dim` dashed
- Worked background uses `--state-bonus`
- Worked border uses `--state-bonus-border`
- Country code `US` / `UK` / `FR` in small DM Sans 10px at top-right

**Hover behavior on any tile:**
An expanded tooltip-style card appears after a 200ms delay:
```
┌─────────────────────────────────┐
│  K2A – New York                 │
│  Colony #1 · First worked: 14:22│
│                                 │
│       SSB   CW  RTTY   FT8  DIG │
│  20m   ●    ●    ○      ●    ○  │
│  40m   ●    ○    ○      ○    ○  │
│  15m   ○    ●    ○      ○    ○  │
│  ...                            │
│                                 │
│  3 QSOs total                   │
└─────────────────────────────────┘
```

---

### 5D. Band/Mode Matrix (right column, below station grid)

**Section label:** `BAND / MODE MATRIX` — same label treatment

**Structure:**
- First column: band names — DM Sans 12px, right-aligned, `--text-secondary`. Row height 28px.
- Column headers: SSB · CW · RTTY · FT8 · DIG — DM Sans 11px uppercase, centered.
- Each cell: JetBrains Mono 12px, centered. Shows `·` for 0, `n/13` for partial, `13` with full styling for complete.

Cell background coloring:
- Empty `·`: `--bg-surface`, `--text-muted` text
- 1–12: linear opacity scale — `rgba(201, 168, 76, n/13 * 0.35)` tint
- Full 13/13: `--state-worked` background, `--state-worked-text` text, no fraction shown

Bands ordered by frequency descending: 160m, 80m, 40m, 30m, 20m, 17m, 15m, 12m, 10m, 6m, 2m.

---

### 5E. QSO Log List (Bottom Panel)

**Height:** Fixed at 240px. The panel itself is fixed; only the table rows scroll internally.
**Top border:** 1px `--border-default`
**Background:** `--bg-surface`

#### Log List Header Row

Left: `QSO LOG` panel label + `(47 contacts)` count in muted parentheses
Right: a small filter field (search by callsign), and a `↑ Newest First` / `↑ Oldest First` toggle button.

**Column headers** (DM Sans 11px uppercase, `--text-secondary`):
`#` · `UTC TIME` · `CALLSIGN` · `COLONY / NAME` · `BAND` · `MODE` · `SNT` · `RCV` · `QTH` · `NOTES`

Column widths:
- `#` → 40px
- `UTC TIME` → 80px
- `CALLSIGN` → 90px
- `COLONY / NAME` → 140px
- `BAND` → 60px
- `MODE` → 60px
- `SNT` → 60px
- `RCV` → 60px
- `QTH` → 70px
- `NOTES` → fills remaining

#### Log Rows

Row height: 28px. Alternating row background: even rows are `--bg-surface`, odd rows are `--bg-elevated`.

**Colony station rows** get a 3px solid `--state-worked-border` left border accent. Bonus station rows get `--state-bonus-border`. Non-colony QSOs have no left border.

**Text:** JetBrains Mono 12px for callsign, RST, band, mode columns. DM Sans 12px for colony name and notes.

**Hover state:** Row background shifts to `--bg-overlay`. Two action icons fade in at the right edge (200ms):
- Edit (pencil icon, 14px) — opens inline edit mode
- Delete (trash icon, 14px) — triggers a confirmation popover: `"Delete this QSO? [Yes] [No]"`

**Inline edit mode:** Row height expands to 40px, cells become inputs with a bottom-border focus indicator. Pressing Escape cancels. Pressing Enter on the last field saves.

**New row animation:** When a QSO is logged, the new row appears at the top with:
- Gold flash: `background-color` from `rgba(201, 168, 76, 0.25)` to transparent over 1200ms
- Slide-down: `translateY(-6px) → translateY(0)` over 150ms

---

### 5F. Settings Modal

**Overlay:** `rgba(0,0,0,0.6)` backdrop with `backdrop-filter: blur(4px)`
**Modal container:** `--bg-surface`, 480px wide, rounded 8px, shadow `0 20px 60px rgba(0,0,0,0.4)`
**Animation:** slides down from slightly above center + fades in over 200ms

**Header:** `Settings` in Libre Baskerville 20px. Close X in top-right.

**Sections:**

**Operator:**
- My Callsign (JetBrains Mono input, auto-uppercase)
- My Name (DM Sans input)
- My State / Province / Country (DM Sans input)

**Logging Defaults:**
- Default Mode (segmented buttons)
- Default Sent RST (auto-filled based on mode, editable)

**Appearance:**
- Theme: three buttons `Light · Dark · System` — same segmented style.

**Export:**
- ADIF Export Path — path input with a `Browse…` button (Tauri file dialog API)
- Export button: `Export ADIF Now`

**Footer:** `Save` (primary button) · `Cancel` (text button)

---

## 6. Tab Order — Complete Specification

```
Tab 1  → Callsign input
Tab 2  → Band selector (arrow keys navigate within group)
Tab 3  → Mode selector (arrow keys navigate within group)
Tab 4  → Sent RST input
Tab 5  → Rcvd RST input
Tab 6  → QTH input
Tab 7  → Notes textarea
Tab 8  → Log It button
```

**Global keyboard shortcuts:**
- `Ctrl+L` / `Cmd+L` — Focus the Callsign field immediately
- `Enter` (from Callsign field) — Skip to Log It (all other fields already set)
- `Enter` (from Notes field) — Trigger Log It
- `Escape` — Clear callsign field and cancel current entry
- `Ctrl+Z` / `Cmd+Z` — Undo last logged QSO (10-second window)

**Segmented button keyboard nav:**
- When a segmented button group has focus, Left/Right arrow keys cycle through options. Space/Enter selects.
- Tab moves out of the group to the next logical field.

---

## 7. Micro-interactions & Motion Inventory

### High-Impact Moments

**1. First Work of a Colony Station**
- Station tile: scale pulse `1 → 1.08 → 1` over 350ms with `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Tile border and background transition to worked state over 300ms
- New log row slides in at top of log list with gold flash

**2. Sweep Completion (all 13 colonies)**
- Sweep achievement badge unlocks: border fills solid, shimmer animation plays once
- Toast notification slides in from top-right: `"13 Colony Sweep Complete!"` — stays 4 seconds, dismissible
- The 13 colony tiles do a sequential gold wave: tiles flash `--accent-gold` at 40% opacity one by one in historical order, 50ms apart

**3. Full Sweep (all 16 stations)**
- Same as above but toast reads `"Full Sweep with All Bonuses!"` and entire grid pulses once

**4. Dupe Warning**
- Callsign field border transitions to red over 80ms
- DUPE badge slides in from right over 120ms
- Subtle shake on the callsign field: `translateX(0 → -3px → 3px → -2px → 0)` over 200ms

**5. Log It button press**
- Button text swaps from `LOG IT` to `✓ LOGGED` instantly
- After 800ms, text swaps back with 150ms fade; callsign field focuses

**6. Settings gear icon hover**
- 30° clockwise rotation over 200ms

**7. Theme toggle**
- Sun/moon icon: 150ms opacity crossfade
- All CSS variable-driven colors transition via `transition: background-color 200ms, color 200ms, border-color 200ms` on `:root`

**8. Undo window (post-logging)**
For 10 seconds after logging, below the Log It button:
`"Undo last entry (K2A 20m SSB) ← 9s"` with a live countdown. Disappears after 10s or when next QSO is logged.

---

## 8. Accessibility Considerations

### Keyboard Navigation
- Full keyboard operation through the entire logging workflow without a mouse.
- All interactive elements have visible focus indicators: 2px solid `--border-focus` outline, 2px offset.
- Skip-link at app start (hidden unless focused): `"Skip to contact entry"`.

### Color & Contrast
- All text/background pairs meet WCAG AA minimum (4.5:1 for body text, 3:1 for UI components).
- `--accent-gold` on `--bg-surface` in dark theme: `#C9A84C` on `#161C26` = 5.8:1 ✓
- Never rely on color alone to convey status. DUPE uses both red color AND the "DUPE" text badge. Worked stations use both green color AND a checkmark icon.

### Screen Reader Support
- Station grid tiles: `role="gridcell"`, `aria-label="K2A New York, worked"` / `"not yet worked"`
- Progress indicators: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
- Log list table: semantic `<table>` with `<th scope="col">` headers
- DUPE warning: `role="alert"` so screen readers announce it immediately
- Toast notifications: `role="status"` and `aria-live="polite"`

### Motion
- All celebratory animations suppressed when OS prefers reduced motion: `@media (prefers-reduced-motion: reduce)`. Replace with instant state transitions.

### Font Sizing
- Base font size respects OS text size preferences. Use `rem` units throughout; only pixel values for borders and outlines.

### Responsive / Window Resizing
- Minimum: 1024×720px — at this size, all three main panels are visible.
- At 1280px+: Band/Mode matrix in right column is fully visible.
- Below 1024px: show a banner recommending a larger window; app remains functional with left column scrolling internally.

---

## 9. Design Decisions with Rationale

**Why segmented buttons instead of dropdowns for Band/Mode?**
Dropdowns require two actions (click to open, click to select) and break keyboard flow. Segmented buttons are one action. During a pile-up, operators may log dozens of contacts per hour on the same band and mode — the buttons provide visual confirmation of the current state at a glance without requiring a click to discover it.

**Why JetBrains Mono for callsigns/RST?**
Ham radio callsigns contain the specific character pairs most monospace fonts render ambiguously: `K2A`, `WM3PEN`. The characters `0/O`, `1/I/l`, and `5/S` must be instantly distinguishable at a glance, under time pressure. JetBrains Mono has the highest character differentiation of any widely-available monospace. This is a functional choice, not an aesthetic one.

**Why Libre Baskerville for display type?**
The event celebrates American colonial history. A refined old-style serif carries that resonance authentically without resorting to gimmick. Baskerville specifically is a transitional serif — it feels contemporary and precise, not costumed.

**Why is the band/mode matrix in both columns?**
The compact version in the left column gives the operator immediate feedback about the current band+mode while logging. The full version in the right column is for strategic overview — deciding which bands to monitor next for missing colonies. These serve different cognitive tasks.

**Why no hover-only critical information?**
The tile hover tooltip is supplementary, not essential. The essential worked/not-worked status is always visible. This is important for operators who may be running the logger on a touchscreen or tablet.

**Why fixed-height log list instead of collapsible?**
Operators need confirmation that their last QSO was logged correctly while simultaneously entering the next one. A collapsible panel would require a deliberate action to verify. The fixed 240px keeps the last few QSOs permanently visible — enough to check for errors without overwhelming the entry form or status grid.

**Why deep navy background instead of a warm dark?**
Warm dark themes reduce contrast for the blue-heavy displays many operators have open alongside logging software (SDR, spectrum analyzers). The cool-dark navy is easier to manage in a multi-monitor setup with other tools that default to dark blue/black themes.

**Why the "undo window" instead of a standard undo menu?**
A time-limited undo (10 seconds) matches the mental model of logging: the operator knows immediately if they made an error, not ten minutes later. The countdown creates gentle urgency without stress.

**Why are bonus stations visually separated but still in the same grid?**
The sweep definition treats colonies and bonus stations as distinct tiers. Visually separating them reflects this while keeping the total picture readable in one glance. A separate panel would force unnecessary eye movement.

---

## 10. File Structure Recommendation

```
src/
├── index.html
├── main.js (or main.ts)
├── styles/
│   ├── tokens.css        ← All CSS custom properties (both themes)
│   ├── base.css          ← Reset, typography, font-face declarations
│   ├── layout.css        ← AppShell grid, column definitions
│   └── animations.css    ← All @keyframes declarations
├── components/
│   ├── Toolbar/
│   ├── ContactEntry/
│   ├── SweepTracker/
│   ├── StationGrid/
│   ├── StationTile/
│   ├── BandModeMatrix/
│   ├── LogList/
│   ├── LogRow/
│   ├── Settings/
│   └── shared/
│       ├── SegmentedButtons/
│       ├── Badge/
│       ├── Toast/
│       └── ProgressBar/
└── store/
    ├── contacts.js       ← QSO log state
    ├── sweep.js          ← Derived sweep status
    └── settings.js       ← User preferences + theme
```

### Theme Token Structure (`tokens.css`)

```css
:root[data-theme="dark"] { /* all --var values */ }
:root[data-theme="light"] { /* all --var values */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* mirrors dark values */ }
}
```

This allows the system-preference auto-detect while still honoring an explicit manual override stored in app settings.

---

## 11. Station Reference

| Callsign | Colony / Station | State / Country |
|---|---|---|
| K2A | Colony #1 — New York | NY |
| K2B | Colony #2 — Virginia | VA |
| K2C | Colony #3 — Rhode Island | RI |
| K2D | Colony #4 — Connecticut | CT |
| K2E | Colony #5 — Delaware | DE |
| K2F | Colony #6 — Maryland | MD |
| K2G | Colony #7 — Georgia | GA |
| K2H | Colony #8 — Massachusetts | MA |
| K2I | Colony #9 — New Jersey | NJ |
| K2J | Colony #10 — North Carolina | NC |
| K2K | Colony #11 — New Hampshire | NH |
| K2L | Colony #12 — South Carolina | SC |
| K2M | Colony #13 — Pennsylvania | PA |
| WM3PEN | Bonus — Philadelphia | PA |
| GB13COL | Bonus — Great Britain | UK |
| TM13COL | Bonus — France | FR |

**Sweep tiers:**
- **Base sweep:** Work all 13 colonies (K2A–K2M)
- **Enhanced sweep:** All 13 + WM3PEN
- **Full sweep:** All 13 + WM3PEN + GB13COL + TM13COL
