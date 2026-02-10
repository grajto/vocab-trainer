# STYLE_MAP.md

## Tokens
Poniżej tokeny wprowadzone do odwzorowania stylu Quizlet bez kopiowania ich losowych klas buildowych:

- `--bg`: tło całej strony/aplikacji.
- `--surface`: tło elementów powierzchniowych (karty, pane).
- `--text`: podstawowy kolor tekstu.
- `--muted`: kolor tekstu drugorzędnego.
- `--border`: domyślne obramowania.
- `--ring`: kolor focus-ringu dla klawiatury/focus-visible.
- `--shadow-sm`: cień stanu normalnego kart.
- `--shadow-md`: cień stanu hover/interakcji kart.
- `--radius-md`: średnie zaokrąglenie.
- `--radius-lg`: większe zaokrąglenie (karty).
- `--space-1`: podstawowy krok spacingu.

## Components

### Quizlet TopNav -> nasz `TopNav`
**Mapowanie stylu:**
- wysokość nav: ~64px (desktop), mniejsza na mobile,
- cienka dolna linia (subtelny border),
- centralny search pill z ikoną,
- input z delikatnym tłem, borderem, zmianą border+ring na focus.

**U nas:** `.top-nav-minimal`, `.top-nav-minimal__inner`, `.top-nav-minimal__search`, `.top-nav-minimal__search:focus-within`.

### Quizlet Sidebar -> nasz `LeftSidebar`
**Mapowanie stylu:**
- stała szerokość kolumny,
- sekcje oddzielone subtelną linią,
- itemy ok. 40–44px wysokości,
- hover: jasny tinted background,
- active: mocniejszy tinted background + semibold + kolor akcentu.

**U nas:** `.sidebar`, `.sidebar__group + .sidebar__group`, `.sidebar__title`, `.sidebar__link`, `.sidebar__link:hover`, `.sidebar__link.is-active`.

### Quizlet Card -> nasz `Card` (dashboardowe bloki)
**Mapowanie stylu:**
- tło: surface,
- border: 1px soft,
- radius: większy (card-like),
- shadow: subtelny w normal, mocniejszy w hover.

**U nas:** `.dash-stat-card`, `.jump-card`, `.quick-suggestion-card`, `.dash-card-box` + ich `:hover`.

### Quizlet Buttons/Input -> nasze definicje
**Button:**
- Primary: nowoczesny filled (blue accent),
- Ghost/secondary: neutralny outline,
- focus-visible: wyraźny ring tokenowy.

**Input (search):**
- rounded pill,
- neutral background + border,
- focus: border + ring.

**U nas:** `.quick-suggestion-btn`, `.jump-card__btn`, `.dash-action-btn`, `.dash-action-btn--ghost`, `.top-nav-minimal__search`.

## Breakpoints

### Desktop
- układ 2-kolumnowy: sidebar + content.
- szeroki top search.

### Tablet
- zwężenie sidebaru i skali nagłówków,
- zachowanie tych samych kontraktów kart i spacingów.

### Mobile
- stacked layout (1 kolumna),
- sidebar przechodzi nad contentem,
- search/nav zmniejszone,
- nagłówki i tytuły kart skalowane w dół.

## Zasada implementacji
- Brak kopiowania klas hashowanych z Quizlet.
- Wszystko oparte o stałe tokeny CSS + nasze selektory komponentowe.
- Zmiany wyłącznie wizualne (bez zmiany logiki komponentów).
