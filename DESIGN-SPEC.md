# FitEqub Design System — Pixel-Perfect Implementation Spec

> **Purpose:** This document describes every visual detail from the 15 Stitch design screenshots. Claude Code should implement these specs exactly across all TMA pages. No approximations.

---

## 1. GLOBAL DESIGN TOKENS

### Colors
```css
/* Backgrounds */
--bg-primary: #0a0a0a;          /* Main app background - near black */
--bg-card: #1c1c1e;             /* Card/section backgrounds - dark gray */
--bg-card-elevated: #2c2c2e;    /* Elevated cards, inputs, dropdowns */
--bg-overlay: #1a1a1a;          /* Modal/sheet overlays */

/* Brand Colors */
--green-primary: #00C853;       /* Primary CTA buttons, progress bars, active states */
--green-glow: rgba(0,200,83,0.3); /* Green glow/shadow on buttons and progress rings */
--green-neon: #00E676;          /* Neon green for scan-to-confirm, accent text */
--gold-primary: #FFD700;        /* Gold for ETB amounts, rankings, premium labels */
--gold-dark: #B8860B;           /* Darker gold for borders, secondary gold */
--gold-gradient: linear-gradient(135deg, #00C853 0%, #FFD700 100%); /* Green-to-gold gradient for invite CTA */

/* Text Colors */
--text-primary: #FFFFFF;        /* Primary text - pure white */
--text-secondary: #8E8E93;      /* Subtitle text, labels, timestamps */
--text-tertiary: #636366;       /* Disabled text, minor labels */

/* Accent Colors */
--red-warning: #FF3B30;         /* Urgency badges, red dot indicators, penalties */
--orange-warning: #FF9500;      /* Warning status, timer countdowns */
--cyan-accent: #00BCD4;         /* Total Steps stat card border */
--yellow-connect: #FFC107;      /* Connect buttons on sync screen */

/* Borders */
--border-card: rgba(255,255,255,0.08);  /* Subtle card borders */
--border-gold: rgba(255,215,0,0.4);     /* Gold borders on premium cards */
--border-green: rgba(0,200,83,0.4);     /* Green borders on active/success cards */
```

### Typography
```css
/* Font: -apple-system, SF Pro Display, Inter, system-ui */
/* All sizes in px for TMA consistency */

--font-title-hero: 36px;       /* "FitEqub" logo text, hero ETB amounts */
--font-title-large: 28px;      /* Screen titles: "Step Challenge Leaderboard" */
--font-title-section: 22px;    /* Section headers: "Equb Details", "Rules" */
--font-title-card: 20px;       /* Card titles: "Equb Rooms", "Gym Day Passes" */
--font-body-large: 18px;       /* Entry/Payout amounts, gym names */
--font-body: 16px;             /* Regular body text, list items */
--font-body-small: 14px;       /* Timestamps, sub-labels */
--font-caption: 12px;          /* Captions, badge labels */

/* Weights */
--weight-bold: 700;            /* Titles, CTAs, amounts */
--weight-semibold: 600;        /* Section headers, card titles */
--weight-medium: 500;          /* Body text */
--weight-regular: 400;         /* Secondary text */
```

### Spacing & Layout
```css
--radius-card: 16px;           /* All cards */
--radius-button: 12px;         /* CTA buttons */
--radius-badge: 20px;          /* Status badges, tags */
--radius-avatar: 50%;          /* Circular avatars */
--radius-input: 10px;          /* Input fields, dropdowns */
--radius-qr: 16px;             /* QR code container */

--padding-screen: 16px;        /* Screen horizontal padding */
--padding-card: 16px;          /* Inside cards */
--gap-sections: 16px;          /* Between major sections */
--gap-cards: 12px;             /* Between cards in a list */
--gap-items: 8px;              /* Between items inside a card */
```

### Shadows & Effects
```css
/* Green glow for progress ring and active elements */
box-shadow: 0 0 30px rgba(0,200,83,0.4), 0 0 60px rgba(0,200,83,0.2);

/* Gold glow for premium elements */
box-shadow: 0 0 20px rgba(255,215,0,0.3);

/* Card shadow */
box-shadow: 0 2px 8px rgba(0,0,0,0.3);

/* Button press */
box-shadow: 0 0 20px rgba(0,200,83,0.5);

/* Neon border glow (QR screen, bot nav active) */
box-shadow: 0 0 10px rgba(0,200,83,0.6);
```

---

## 2. BOTTOM NAVIGATION BAR

The bottom nav is consistent across all screens. It has 5 items with icons above labels.

```
Layout: fixed bottom, full width, bg: #1c1c1e, border-top: 1px solid rgba(255,255,255,0.08)
Height: 56px + safe-area-inset-bottom
Padding: 8px 0
```

### Nav Items (varies by screen but core pattern):
| Icon | Label | Active Color | Inactive Color |
|------|-------|-------------|----------------|
| House | Home | #FFD700 (gold) | #8E8E93 |
| Coins+Arrow | Equbs | #FFD700 (gold) | #8E8E93 |
| Dumbbell | Gyms | #FF6B6B (coral) | #8E8E93 |
| Footprints | Steps | #E040FB (purple/pink neon) | #8E8E93 |
| Person circle | Profile | #00C853 (green) | #8E8E93 |

**Active state:** Icon + label in the active color, icon has a subtle glow ring behind it.
**Inactive state:** Icon + label in --text-secondary gray.

Note: The nav icons in Stitch are colorful neon-style when active (not just green). Each tab has its own accent:
- Home = gold house icon
- Equbs = gold coins icon  
- Gyms = coral/red dumbbell
- Steps = pink/purple footprints
- Profile = green person circle

---

## 3. HOME DASHBOARD (Screen 8)

### Header
```
"FitEqub" — 36px, bold, white, left-aligned
"Stake. Sweat. Split the pot." — 14px, --text-secondary, left-aligned
Spacing below header: 24px
```

### Progress Ring Card
```
Container: bg: #1c1c1e, border-radius: 16px, padding: 24px
Title: "Your Progress" — 20px, bold, white, centered

Ring:
- SVG circle, 200px diameter
- Stroke: #00C853, strokeWidth: 8px
- Background track: #2c2c2e, strokeWidth: 8px
- Glow: filter: drop-shadow(0 0 20px rgba(0,200,83,0.5))
- ~75% filled (dasharray animation)
- Caps: round

Center text:
- "12,500 ETB" — 32px, bold, #00C853
- "Potential Payout" — 14px, #FFD700, below amount
```

### Feature Cards (3 cards, vertical stack)
Each card is a horizontal row layout:

```
Container: bg: #1c1c1e, border-radius: 16px, padding: 16px
Layout: flex row, align-items: center, gap: 12px

Left icon: 48x48px, bg: rgba(255,215,0,0.15) (gold tint), border-radius: 12px
  - Equb Rooms: people group icon (gold)
  - Gym Day Passes: dumbbell icon (gold)
  - Step Challenge: shoe/sneaker icon (gold)

Content (flex: 1):
  - Title: "Equb Rooms" — 18px, bold, white
  - Subtitle: "Join a fitness accountability group" — 13px, --text-secondary

Right side:
  - Status badge: "Ends in 2 days" — 12px, --text-secondary
  - OR: "Discount Active" — 12px, #00C853
  - OR: "15,450 Steps" — 12px, #00C853

Progress bar below content:
  - Height: 4px, border-radius: 2px
  - Track: #2c2c2e
  - Fill: #00C853
  - Width varies per card
```

---

## 4. EQUB ROOMS LIST (Screen 2)

### Header
```
"FitEqub" — 32px, bold, #00C853, centered
"Equb Rooms" — 18px, white, centered, below logo
```

### Room Cards (vertical list, 12px gap)
Each card:

```
Container: bg: #1c1c1e, border: 1px solid rgba(255,255,255,0.1), border-radius: 16px, padding: 16px

Top row (flex, space-between):
  Left box:
    bg: #2c2c2e, border: 1px solid rgba(255,215,0,0.3), border-radius: 8px, padding: 8px 12px
    "Entry: 500 ETB" — 16px, bold, white
    "Payout: 10,000 ETB" — 16px, bold, white

  Right side:
    "Closes in" — 12px, #FF9500 (orange)
    "02:45:10" — 28px, bold, #FFD700, font-variant-numeric: tabular-nums
    (countdown timer with monospace digits)

Middle row:
  Fitness icon (green runner/dumbbell) + "10k Steps/Day" — 16px, white
  
  "Join Now" button (only on first/open card):
    border: 1px solid #FFD700, border-radius: 8px
    color: #FFD700, bg: transparent
    padding: 6px 16px, font-size: 14px, font-weight: 600

Bottom:
  Progress bar — 6px height, border-radius: 3px
  Track: #2c2c2e, Fill: #00C853
  "18/20 spots filled" — 12px, --text-secondary
```

### Urgency Colors for Countdown:
- > 2 hours: #FFD700 (gold)
- 1-2 hours: #FF9500 (orange)  
- < 1 hour: #FF3B30 (red, pulsing)

---

## 5. STEP CHALLENGE LEADERBOARD (Screen 3)

### Prize Pool Banner
```
Full width, bg: linear-gradient(180deg, #FFD700 0%, #B8860B 100%)
Border-radius: 12px, padding: 16px, text-align: center
Border: 2px solid #FFD700

"CURRENT PRIZE POOL" — 14px, bold, black/dark, tracking: 2px
"15,000 ETB" — 36px, bold, black + ETB coin icon
```

### Podium Section
```
Height: ~280px, flex row, align-items: flex-end, justify-content: center

2nd Place (left):
  Pedestal: bg: #C0C0C0 (silver), 100px wide, 120px tall, border-radius: 12px 12px 0 0
  Avatar: 56px circle, border: 3px solid #C0C0C0, positioned above pedestal
  "2nd" — 14px, bold, #C0C0C0
  "Dawit K." — 14px, bold, white
  "48,200 Steps" — 12px, --text-secondary
  "3,750 ETB" — 14px, bold, #00C853

1st Place (center, tallest):
  Pedestal: bg: linear-gradient(180deg, #FFD700 0%, #B8860B 100%), 120px wide, 160px tall
  Avatar: 64px circle, border: 3px solid #FFD700, gold crown icon above
  "1st" — 16px, bold, #FFD700
  "Abeba T." — 16px, bold, white
  "50,000 Steps" — 13px, --text-secondary
  "7,500 ETB" — 16px, bold, #00C853

3rd Place (right):
  Pedestal: bg: #CD7F32 (bronze), 100px wide, 90px tall
  Avatar: 52px circle, border: 3px solid #CD7F32
  "3rd" — 14px, bold, #CD7F32
  "Sara M." — 14px, bold, white
  "45,200 Steps" — 12px, --text-secondary
  "1,875 ETB" — 14px, bold, #00C853
```

### Rank List (positions 4+)
```
Each row: flex, align-items: center, padding: 12px 0, border-bottom: 1px solid rgba(255,255,255,0.05)

Rank number: 16px, bold, --text-secondary, width: 24px
Avatar: 40px circle
Name: 16px, bold, white, flex: 1
Steps: 14px, --text-secondary
ETB amount: 16px, bold, #00C853, text-align: right
```

### CTA Button
```
"UPDATE MY STEPS" — full width
bg: #00C853, color: white, font-size: 18px, font-weight: 700
padding: 16px, border-radius: 12px
text-transform: uppercase, letter-spacing: 1px
box-shadow: 0 0 20px rgba(0,200,83,0.4)
```

---

## 6. PROFILE / EARNINGS (Screen 7)

### Avatar Section
```
Center-aligned, padding-top: 32px
Avatar: 96px circle, border: 3px solid #FFD700 (gold ring)
Name: "Abebe Kebede" — 22px, bold, white, margin-top: 12px
```

### Stat Cards (2 columns, side by side)
```
Gap: 12px between cards

Total Earned card:
  Border: 2px solid #00C853, border-radius: 12px, padding: 12px
  "Total Earned" — 12px, #00C853
  Coin icon — right side, gold
  "ETB 15,400" — 24px, bold, #00C853

Total Steps card:
  Border: 2px solid #00BCD4 (cyan), border-radius: 12px, padding: 12px
  "Total Steps" — 12px, #00BCD4
  Runner icon — right side, cyan
  "2,543,000" — 24px, bold, #00BCD4
```

### Fitness Achievements
```
"Fitness Achievements" — 20px, bold, white
Badge grid: 4 columns, gap: 12px

Each badge:
  bg: #2c2c2e, border-radius: 12px, padding: 12px, text-align: center
  Emoji icon: 32px
  Label: 11px, --text-secondary, margin-top: 4px
  
  Badges shown:
  - Early Bird (sunrise+bird emoji)
  - 100k Steps (sneaker emoji)
  - Marathoner (runner emoji)
  - Team Player (high-five emoji)
```

### Earning History
```
"Earning History" — 20px, bold, white
List items:
  flex row, justify-content: space-between, padding: 10px 0
  border-bottom: 1px solid rgba(255,255,255,0.05)
  
  Left: "Oct 15, 2023 - Equb Payout" — 14px, white
  Right: "ETB 3,200" — 16px, bold, #00C853
```

### CTA
```
"Sync Fitness Data" — full width
border: 2px solid #00C853, bg: transparent, color: #00C853
font-size: 16px, font-weight: 600
padding: 14px, border-radius: 12px
```

---

## 7. EQUB ROOM DETAIL (Screen 11)

### Hero Header
```
No card container — directly on bg
"Bole Elite 10k" — 36px, bold, white
"50,000 ETB" — 40px, bold, #FFD700 (with gold glow)
```

### Rules Section
```
"Rules" — 20px, bold, white

Rule items (each with icon + text):
  Green walking icon + "10k Steps Daily" — 18px, bold, white
  Description below: 14px, --text-secondary
  
  Green muscle icon + "3 Gym Check-ins/Week" — 18px, bold, white
  Description below: 14px, --text-secondary
```

### Member List
```
"Member List" — 20px, bold, white
2-column grid, gap: 12px

Each member card:
  bg: #1c1c1e, border: 1px solid rgba(255,215,0,0.3), border-radius: 12px, padding: 12px
  
  Avatar: 40px circle (left)
  Status badge (right-aligned):
    "On Track" + green checkmark — color: #00C853, 12px
    OR "Warning" + yellow exclamation — color: #FF9500, 12px
  
  Name: "Kebede T." — 16px, bold, white
  "Next Payout in 4 Days" — 12px, #FFD700
```

### My Progress Card
```
bg: #1c1c1e, border: 1px solid rgba(255,215,0,0.3), border-radius: 12px, padding: 16px

"My Progress" — 18px, bold, white
Progress bar: 6px height, border-radius: 3px
  Track: #2c2c2e
  Fill: linear-gradient(90deg, #00C853 0%, #FFD700 100%) — green to gold gradient!
  
"34,000" — 16px, bold, #00C853
"/ 50,000 ETB Goal" — 14px, --text-secondary
"Rank: 3rd of 12" — 14px, bold, white (right-aligned)
```

---

## 8. GYM DAY PASSES (Screen 10)

### Search Bar
```
bg: #2c2c2e, border: 1px solid rgba(255,215,0,0.3), border-radius: 10px
Padding: 12px 16px
Search icon (left): --text-secondary
Placeholder: "Search gyms, locations..." — 14px, --text-secondary
Mic icon (right): --text-secondary
```

### Filter Chips
```
Horizontal scroll, gap: 8px
Active chip: bg: transparent, border: 1px solid #FFD700, color: #FFD700, border-radius: 20px
Inactive chip: bg: transparent, border: 1px solid rgba(255,255,255,0.15), color: white

Labels: "Near Me", "Top Rated", "Cheapest"
Padding: 6px 16px, font-size: 13px
```

### Gym Cards
```
Each card: border: 1px solid rgba(255,215,0,0.3), border-radius: 12px, overflow: hidden
Height: ~120px, position: relative

Background: gym photo (right side, 50% width, object-fit: cover, slight dark gradient overlay from left)

Left content (padding: 16px, z-index above image):
  Gym name: "Kuriftu Gym" — 20px, bold, white
  Location: "Bole" — 13px, --text-secondary
  Price: "150 ETB" — 22px, bold, #FFD700

Top-right badge:
  "Equb Eligible" + checkmark
  bg: #00C853, color: white, font-size: 11px, bold
  padding: 4px 8px, border-radius: 4px
  
Bottom-right:
  "Buy Pass" button
  bg: #00C853, color: white, font-size: 14px, bold
  padding: 8px 20px, border-radius: 8px
```

---

## 9. CREATE NEW EQUB — BASICS (Screen 5)

### Step Progress Bar
```
3-step indicator:
Active step: filled green bar + green dot + label
Upcoming steps: gray bar + gray dot + label

"1/3: Basics" — 14px, white (next to active dot)
Bar height: 3px, border-radius: 2px
```

### Form Fields
```
Each field:
  Label: 14px, --text-secondary, margin-bottom: 6px
  
  Text input:
    bg: #2c2c2e, border: 1px solid rgba(255,215,0,0.3), border-radius: 10px
    padding: 14px 16px, color: white, font-size: 16px
    Placeholder: --text-tertiary

  Amount input (Target Payout):
    Same as above but value in #FFD700 (gold) — "25,000 ETB"
    ETB icon on right side

  Slider (Number of Participants):
    Track: #2c2c2e, 4px height
    Filled portion: #FFD700 (gold)
    Thumb: 20px circle, #FFD700, border: 2px solid white
    Min/Max labels: 12px, --text-secondary
    Current value: 16px, bold, #00C853 (below thumb)
```

### Fitness Requirement Dropdown
```
Collapsed: border: 1px solid #00C853, border-radius: 10px, padding: 14px 16px
  "Fitness Requirement" — 16px, white
  Chevron down icon: #00C853

Expanded: same border but content below:
  bg: #2c2c2e, border-radius: 0 0 10px 10px
  Each option: padding: 12px 16px, flex row, gap: 8px
    Icon (green) + "10k Steps/Day" — 15px, white
    Icon (orange) + "3 Gym Visits/Week" — 15px, white
    Icon (green) + "5km Run/Week" — 15px, white
```

### Rule Summary Card
```
bg: transparent, border: 1px solid #00C853, border-radius: 12px, padding: 16px

"Rule Summary" — 16px, bold, white
"Updates in real-time" — 12px, --text-secondary (right-aligned)

"Estimated Entry Fee per Person:" — 14px, --text-secondary
"2,500 ETB" — 28px, bold, #00C853
```

### CTA Button (all screens)
```
"Next: Set Rules" — full width
bg: #00C853 (or #00E676 for brighter variant)
color: #0a0a0a (dark text on green)
font-size: 18px, font-weight: 700
padding: 16px, border-radius: 12px
margin-top: 24px
box-shadow: 0 0 20px rgba(0,200,83,0.3)
```

---

## 10. SET RULES & PENALTIES (Screen 4)

### Toggle Cards
```
"Fitness Targets" card:
  bg: #1c1c1e, border-radius: 12px, padding: 16px
  Title row: flex, justify-content: space-between
    Icon + "Fitness Targets" — 18px, bold, white
    Toggle: iOS-style, bg: #00C853 when ON, width: 50px, height: 28px
    "ON" text inside toggle

Sliders inside card:
  "Minimum Daily Steps" — 14px, white
  "10,000 Steps" — 16px, bold, white (right-aligned)
  
  Slider: same as form slider (green fill, green dot thumb)
  "5,000" left label, "20,000+" right label — 12px, --text-secondary
```

### Penalty System Card
```
Same toggle pattern, icon: money bag

Penalty inputs:
  "Penalty for Missed Goal" — 14px, --text-secondary
  Input: bg: #2c2c2e, border: 1px solid rgba(255,215,0,0.4)
    Yellow warning icon (left), "50 ETB per missed day" — 15px, white
    Up/down stepper arrows (right)

"Penalties are deducted from future payouts." — 12px, #00C853 (italic helper text)

Radio buttons (Payout Frequency):
  "Weekly" | "Bi-weekly" | "Monthly"
  Active: bg: #2c2c2e, border: 1px solid #00C853, green checkmark
  Inactive: bg: transparent, border: 1px solid rgba(255,255,255,0.15)
  Padding: 8px 16px, border-radius: 8px
```

---

## 11. REVIEW & LAUNCH (Screen 1)

### Summary Card (hero)
```
bg: #1c1c1e, border: 2px solid #FFD700, border-radius: 16px, padding: 20px
Gold corner accents (decorative lines at corners — CSS gradient or pseudo-elements)

Title: "Bole Elite 10k" — 28px, bold, white (with fire emojis 🔥)
  
Stat boxes (2 columns):
  Box 1: bg: rgba(255,215,0,0.1), border: 1px solid rgba(255,215,0,0.3), border-radius: 8px
    "50,000 ETB" — 22px, bold, #FFD700
    "Total Payout" — 12px, --text-secondary
  
  Box 2: bg: rgba(0,200,83,0.1), border: 1px solid rgba(0,200,83,0.3), border-radius: 8px
    "10,000 Step" — 22px, bold, #00C853
    "Daily Requirement" — 12px, --text-secondary

Tags below:
  "💰 Guaranteed Pool" — bg: rgba(255,215,0,0.15), border-radius: 20px, padding: 4px 12px
  "🏃 Active Commitment" — bg: rgba(0,200,83,0.15), border-radius: 20px, padding: 4px 12px
```

### Details Section
```
"Equb Details" — 20px, bold, white

Two-column info:
  Calendar icon + "Frequency" (label) / "Weekly" (value)
  Coins icon + "Contribution" (label) / "2,500 ETB / wk" (value)
  Label: 13px, --text-secondary
  Value: 16px, bold, white
```

### Rules Checklist
```
"Rules" — 20px, bold, white
2-column grid:
  Each: green checkmark circle + "10 Members" — 15px, white
  ✅ 10 Members | ✅ 5 Weeks
  ✅ Rotating Payout | ✅ No Early Exit
```

### Penalties List
```
"Penalties" — 20px, bold, white
Each: ⚠️ yellow triangle + text — 15px, white
  "Missed Steps (500 ETB Fine)"
  "Late Payment (10% Fee)"
  "Inactivity Strike"
```

### Launch Button
```
"Launch Equb" — full width, same as primary CTA
bg: #00C853, color: #0a0a0a, 18px bold, padding: 16px, radius: 12px

Below: "Terms & Conditions" — 14px, --text-secondary, underlined, centered
```

---

## 12. INVITE FRIENDS (Screen 6)

### Success Header
```
bg: #0a0a0a with subtle radial gold gradient behind
Checkmark badge icon (gold/green) + "Equb Created!" — 24px, bold, #FFD700

Join code box:
  bg: #1c1c1e, border: 1px solid #FFD700, border-radius: 12px, padding: 16px
  "Unique Join code:" — 12px, --text-secondary
  "BOLE-10K-X" — 28px, bold, white, font-family: monospace
  
  "Copy Code" button (right): 
    bg: #00C853, color: white, border-radius: 50%, 48px circle
    Copy icon centered
```

### Send Invite CTA
```
Full width, bg: linear-gradient(90deg, #00C853 0%, #FFD700 100%)
"Send Invite on Telegram" — 18px, bold, #0a0a0a
padding: 16px, border-radius: 12px
```

### Quick Invite List
```
"Quick Invite" — 18px, bold, white

Each contact row:
  flex row, align-items: center, padding: 12px 0
  border-bottom: 1px solid rgba(255,255,255,0.05)
  
  Avatar: 44px circle, border: 2px solid #FFD700
  Name: 16px, white, flex: 1, margin-left: 12px
  
  "Send" button:
    bg: #00C853, color: white, font-size: 14px, bold
    padding: 8px 20px, border-radius: 20px
```

### Skip Button
```
"Skip for Now"
border: 1px solid rgba(255,215,0,0.3), bg: transparent, color: --text-secondary
full width, padding: 14px, border-radius: 12px, font-size: 16px
```

---

## 13. NOTIFICATION CENTER (Screen 12)

### Tab Bar
```
"All" | "Earnings" tabs
Active tab: white text, bottom border 2px solid #FFD700
Inactive tab: --text-secondary text, no border
```

### Notification Cards
Each notification has a colored left border indicating type:

```
Payout notification:
  border-left: 3px solid #FFD700
  bg: #1c1c1e, border: 1px solid rgba(255,215,0,0.3)
  Icon: gold coins stack
  Title: "Payout of 12,000 ETB successful!" — 16px, bold, white
  Body: 14px, --text-secondary
  Time: "2 mins ago" — 12px, --text-tertiary

Gym reminder:
  border-left: 3px solid #00C853
  bg: #1c1c1e, border: 1px solid rgba(0,200,83,0.3)
  Icon: green dumbbell
  
Urgency (payment deadline):
  border-left: 3px solid #FF3B30
  bg: #1c1c1e, no special border
  Red dot indicator (pulsing) + alarm clock icon (red)
  Title uses bolder/larger text

Info notification:
  No colored border, standard card
  Blue info circle icon

Earnings notification:
  border-left: 3px solid #FFD700 (gold)
  Same gold coin icon pattern
```

---

## 14. PAYMENT CONFIRMATION (Screen 13)

### Timer Badge
```
Top right: bg: rgba(255,152,0,0.2), border: 1px solid #FF9500
border-radius: 20px, padding: 4px 12px
Clock icon + "14:59" — 16px, bold, #FF9500
```

### Payment Summary Card
```
bg: #1c1c1e, border-radius: 12px, padding: 16px

"1,000 ETB Entry" — 20px, bold, white
"25,000 ETB Payout" — 20px, bold, white
Dumbbell icon + "5 Gym Sessions/Week" — 14px, --text-secondary
```

### Payment Breakdown Table
```
bg: #1c1c1e, border: 1px solid rgba(255,215,0,0.3), border-radius: 12px, padding: 16px

Each row: flex, justify-content: space-between, padding: 8px 0
  "Entry Fee:" — 15px, --text-secondary
  "1,000 ETB" — 15px, white

Divider: 1px solid rgba(255,255,255,0.1)

Total row:
  "Total to Pay:" — 16px, bold, #FFD700
  "1,005 ETB" — 18px, bold, #FFD700
```

### Payment Method
```
"Payment Method" — 18px, bold, white

Method card:
  bg: #1c1c1e, border: 2px solid #FFD700, border-radius: 12px, padding: 14px
  Telebirr logo (left, 36px) + "Telebirr" — 16px, white
  Gold checkmark (right)
```

### Confirm CTA
```
"Confirm and Pay" — same primary CTA pattern
bg: #00C853, full width, etc.
```

---

## 15. WIN CELEBRATION (Screen 14)

### Trophy Animation Area
```
Full screen dark bg with confetti particles (gold/white)
Trophy emoji: 80px, centered
Sparkle/confetti: gold ribbons, stars floating

"FitEqub" — 24px, #FFD700, centered (top)

"YOU WON!" — 36px, bold, #FFD700
"25,000 ETB" — 48px, bold, #00E676 (bright neon green)
"Fitness pays off! Your payout is being transferred to your Telebirr account." — 14px, --text-secondary, centered

Achievement badge:
  bg: #1c1c1e, border-radius: 12px, padding: 12px
  Dumbbell icon + "Gym Sessions/Week - Completed" — 14px, white
```

### Action Buttons
```
"Return to Home" — primary CTA (green)
"Share with Friends" — outline button (gold border, gold text)
```

---

## 16. SYNC FITNESS DATA (Screen 9)

### Hero Icon
```
Large green sync/refresh icon (48px), centered
Circular pulse rings behind it (concentric circles, fading green)
```

### Provider Cards
```
Each: bg: #1c1c1e, border-radius: 12px, padding: 14px
flex row, align-items: center

Logo (left): 36px — Google Fit (heart), Apple Health (heart), Telegram (plane)
Name: 16px, bold, white, flex: 1

"Connect" button (right):
  bg: #FFC107 (yellow), color: #0a0a0a, font-size: 14px, bold
  padding: 8px 20px, border-radius: 8px
```

### Last Synced
```
bg: #1c1c1e, border: 1px solid rgba(0,200,83,0.3), border-radius: 12px
Sync icon + "Last synced: 2 hours ago" — 14px, --text-secondary
padding: 12px 16px
```

### Sync Button
```
"Sync Now" — primary CTA (green, full width)
```

---

## 17. GYM QR CHECK-IN (Screen 15)

### Full-Screen Dark Layout
```
bg: #0a0a0a
Lightning bolt icons (top-left and top-right): #00C853, 24px
Close X button: top-right, 24px

Title: "Check-in at Kuriftu Gym" — 28px, bold, white, centered, margin-top: 48px

QR Code container:
  bg: white, border-radius: 16px, padding: 16px
  Border: 3px solid #00C853
  box-shadow: 0 0 30px rgba(0,200,83,0.4) (green glow)
  QR code: 200x200px

"Scan to confirm your session" — 22px, bold, #FFD700, centered

Session progress:
  bg: #1c1c1e, border-radius: 12px, padding: 12px
  "Session 3 of 5 this week" — 14px, white
  "60%" — 14px, #00C853
  Progress bar: 4px, #00C853 fill
```

---

## 18. IMPLEMENTATION CHECKLIST FOR CLAUDE CODE

1. **Create `theme.css`** with all CSS custom properties from Section 1
2. **Bottom nav component** — 5 tabs with neon-colored active icons (not just green)
3. **Home Dashboard** — progress ring SVG with glow, 3 feature cards
4. **Equb Rooms List** — gold-bordered entry/payout boxes, countdown timers in gold/orange
5. **Step Challenge** — gold gradient prize pool banner, 3-column podium with different heights, ranked list
6. **Profile** — gold-bordered avatar, green + cyan stat cards, badge grid, earning history
7. **Equb Room Detail** — hero header with gold ETB, member grid with status badges, gradient progress bar
8. **Gym Day Passes** — search bar, filter chips, photo-background cards with "Equb Eligible" badges
9. **Create Equb flow** — 3-step progress, form inputs with gold borders, fitness dropdown, rule summary
10. **Set Rules** — toggle cards, sliders, penalty inputs with yellow warning icons, radio buttons
11. **Review & Launch** — gold-bordered hero card with corner accents, details grid, checklist, penalties
12. **Invite Friends** — join code with monospace font, green-to-gold gradient CTA, contact list
13. **Notifications** — colored left borders by type, red dot for urgency, tab filtering
14. **Payment** — countdown timer badge, breakdown table, Telebirr method card
15. **Win Celebration** — confetti particles, large trophy, neon green amount, share buttons
16. **QR Check-in** — full-screen, glowing green QR border, session progress
17. **Sync Fitness** — provider cards with yellow connect buttons, pulse animation on icon

### Key Patterns Claude Code MUST Get Right:
- **Gold (#FFD700) for all ETB amounts** — never white or green for money values
- **Green (#00C853) for progress, CTAs, success states**
- **Card borders are subtle** — rgba(255,255,255,0.08) default, gold rgba for premium
- **Countdown timers use tabular-nums** — monospace digit rendering
- **Buttons: filled green or outlined gold** — never gray or blue
- **The bottom nav icons are NEON-COLORED when active** — not just tinted
- **Progress bars always have rounded caps** — border-radius: half of height
- **All cards are 16px border-radius** — no exceptions
