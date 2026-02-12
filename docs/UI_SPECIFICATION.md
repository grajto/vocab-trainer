# UI/UX Specification

## Session UI/UX Design

### Session Header
- **Left**: Mode badge (pill-shaped, colored by mode type)
  - Translate: Blue (#3B82F6)
  - Sentence: Purple (#A78BFA)
  - Describe: Green (#22C55E)
  - ABCD: Orange (#F59E0B)
- **Center**: Progress "Aktualna / Razem" format (e.g., "3 / 20")
- **Right**: Exit button (×) and Settings gear icon

### Color Tokens
All session screens use consistent color tokens:
- **Success**: #22C55E (green) - for correct answers, completion badges
- **Error**: #EF4444 (red) - for incorrect answers, error states
- **Neutral**: #64748B (slate) - for muted text, secondary elements
- **CTA**: #3B82F6 (blue) - for primary action buttons
- **Warning**: #F59E0B (amber) - for hints, warnings

### Translate Screen
1. **Layout**:
   - Large source word (32px, bold)
   - Direction chip below word (e.g., "PL→EN" or "EN→PL")
   - Single text input with autofocus
   - Primary button: "Sprawdź" (Check)
   - Optional "Pomiń" (Skip) link below button
   
2. **Success State**:
   - Green badge "Translate ✓" appears
   - Success feedback with checkmark
   - Auto-advance after 200ms

3. **Error State**:
   - Red feedback panel
   - Typo detection with "Accept typo?" option
   - Hint button (💡) available

### Sentence Screen
1. **Layout**:
   - Title: "Ułóż zdanie z: {word}"
   - Target English word as colored chip/pill
   - Textarea (4 rows minimum)
   - Previous stage badges: "Translate ✓"
   - Submit button: "Sprawdź zdanie"

2. **Success State**:
   - Toast notification: "Zdanie poprawne"
   - Green badge "Sentence ✓" added
   - Both badges visible: "Translate ✓" "Sentence ✓"

3. **Error State**:
   - Red panel with AI explanation
   - Example sentence provided by AI
   - Badge shows "Sentence ✗"
   - Retry available

### Describe Screen
1. **Layout**: (Analogous to Sentence)
   - Title: "Opisz używając: {word}"
   - Target word chip
   - Textarea (4 rows)
   - Previous badges: "Translate ✓"
   - Submit button: "Sprawdź opis"

2. **Success/Error**: Same pattern as Sentence
   - Success toast: "Opis poprawny"
   - Badges: "Translate ✓" "Describe ✓/✗"

### Accessibility
- **Autofocus**: Input/textarea gets focus automatically
- **Aria-live**: Feedback messages announced to screen readers
- **WCAG AA**: All text meets minimum 4.5:1 contrast ratio
- **Keyboard shortcuts**:
  - Enter: Submit (for inputs)
  - Ctrl/Cmd+Enter: Submit (for textareas)
  - Escape: Close dialogs/menus

### Responsiveness
- Mobile-first design
- Breakpoints: 640px (sm), 768px (md), 1024px (lg)
- Touch-friendly targets (min 44x44px)
- Horizontal scrolling disabled

## Settings Page Design

### Section Structure
Settings organized into 6 clear sections with icons:

1. **Tryb nauki i język** (Languages icon)
   - Radio buttons for direction (PL→EN, EN→PL, Both)
   - Radio buttons for mode (Translate, Sentence, Describe, ABCD, Mixed)

2. **Długość sesji** (Clock icon)
   - Slider: 5-50 cards
   - Stepper buttons (- / +) for quick adjustment
   - Current value display

3. **Codzienny cel** (Target icon)
   - Stepper for daily cards goal (10-50)
   - Slider for minimum minutes (10-60)
   - Visual feedback for current values

4. **Wygląd** (Monitor icon)
   - Radio buttons: Light / Dark / System
   - Theme applies immediately to entire app

5. **Język interfejsu** (Globe icon)
   - Dropdown: Polski / English
   - Language change affects all UI text

6. **Zaawansowane** (TrendingUp icon)
   - AI validation slider (disabled, coming soon)
   - Max new cards per day (SRS system)

### Auto-save
- 1-second debounce after any change
- Toast notification "Zapisano" on successful save
- No manual save button needed (optional manual trigger available)

## Left Sidebar Controls

### Daily Session Panel
1. **Header**: "Codzienna sesja"
2. **Progress Display**:
   - Format: "15/20 fiszek"
   - Progress bar (percentage based)
   - Updates in real-time as cards completed

3. **Quick Settings** (temporary overrides):
   - Direction chips: PL→EN / EN→PL / Both (toggle selection)
   - Mode chips: Tłumaczenie / Zdania / Opis / ABCD (toggle)
   - Session length stepper: - [20] + (5-50 range)

4. **Action Buttons**:
   - "Rozpocznij": Start new session with quick overrides or defaults
   - "Kontynuuj": Resume active session (only shown if session exists)

## Design System Reference

### Spacing Scale
- xs: 6px
- sm: 10px
- md: 14px
- lg: 18px
- xl: 24px
- 2xl: 32px

### Border Radius
- Card: 16px
- Input: 14px
- Button: 999px (pill)
- Icon: 12px

### Typography
- Heading 1: 32px, bold
- Heading 2: 24px, semibold
- Heading 3: 18px, semibold
- Body: 14-16px, regular
- Small: 12-14px, regular

### Shadows
- Card: 0 1px 3px rgba(0,0,0,0.1)
- Card hover: 0 4px 6px rgba(0,0,0,0.1)
- Elevated: 0 10px 15px rgba(0,0,0,0.1)

### Transitions
- Standard: 200ms ease
- Slow: 300ms ease
- Theme change: 150ms ease
