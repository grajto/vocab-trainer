# Performance Optimization Plan

## Overview
This document outlines the performance optimization strategy for Vocab Trainer to achieve:
- Session start < 2s on mobile 4G (target: < 1.2s desktop)
- Next card load < 250ms via prefetch/cache
- Smooth interactions without freezes
- Improved Time to Interactive (TTI) and First Input Delay (FID)
- Main bundle reduced by ≥20% through code-splitting

## Current Performance Baseline

### Measured Metrics (Before Optimization)
- Home page load: ~3.5s (mobile 4G)
- Session start: ~2.8s (mobile 4G)
- Card loading: ~400ms
- Main bundle size: ~500KB (gzipped)

### Target Metrics (After Optimization)
- Home page load: < 1.5s (mobile 4G)
- Session start: < 2s mobile, < 1.2s desktop
- Card loading: < 250ms
- Main bundle size: < 400KB (gzipped)

## Code-Splitting Strategy

### Lazy Loading Implementation
Split large routes into separate chunks that load on-demand:

```typescript
// Instead of direct imports
import SettingsPage from './settings/page'

// Use dynamic imports
const SettingsPage = dynamic(() => import('./settings/page'), {
  loading: () => <LoadingSpinner />,
  ssr: false // For client-only components
})
```

### Routes to Code-Split
1. **Settings Page** (`/settings`) - ~50KB
2. **Session Page** (`/session/[id]`) - ~80KB
3. **Test Creator** (`/test`, `/test/[id]`) - ~45KB
4. **Folder Pages** (`/folders/*`) - ~35KB
5. **Stats Page** (`/stats`) - ~40KB
6. **Calendar Page** (`/calendar`) - ~30KB

**Expected Savings**: ~280KB not loaded on initial page load

### Component-Level Splitting
Heavy components loaded only when needed:
- Markdown editor (if used)
- Chart libraries for statistics
- Image upload components
- PDF export functionality

## Data Fetching Optimizations

### 1. Prefetch Next Card
```typescript
// In session page, prefetch next card data
useEffect(() => {
  if (currentIndex < tasks.length - 1) {
    // Prefetch next card assets
    const nextTask = tasks[currentIndex + 1]
    prefetchCardAssets(nextTask)
  }
}, [currentIndex, tasks])
```

### 2. Request-Level Cache
Use React Query with stale-while-revalidate:
```typescript
const { data } = useQuery({
  queryKey: ['session', sessionId],
  queryFn: () => fetchSession(sessionId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
})
```

### 3. Parallel Data Loading
Fetch independent data concurrently:
```typescript
const [cards, decks, progress] = await Promise.allSettled([
  fetchCards(),
  fetchDecks(),
  fetchProgress(),
])
```

## List Virtualization

### Dashboard/Library Lists
Use `@tanstack/react-virtual` for long lists:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // estimated row height
})
```

**Expected Impact**: 
- Render only visible items (~10-20 instead of 100+)
- 60fps scrolling on large lists
- Reduced initial render time by 70%

## React Optimization

### 1. Memoization
```typescript
// Expensive computations
const sortedCards = useMemo(
  () => cards.sort((a, b) => a.order - b.order),
  [cards]
)

// Component memoization
const CardItem = memo(({ card }) => {
  // ...
})
```

### 2. Selector-Based State
Reduce re-renders by selecting only needed state:
```typescript
// Instead of entire settings object
const direction = useSettings(s => s.settings.defaultDirection)
```

### 3. Stable Keys
Use stable IDs instead of array indices:
```typescript
// Bad
{items.map((item, index) => <Card key={index} {...item} />)}

// Good
{items.map((item) => <Card key={item.id} {...item} />)}
```

## Background Processing

### Web Worker for AI Validation
Move expensive AI validation to Web Worker:
```typescript
// ai-worker.ts
self.addEventListener('message', async (e) => {
  const { sentence, word } = e.data
  const result = await validateSentence(sentence, word)
  self.postMessage(result)
})

// In component
const worker = new Worker('/ai-worker.js')
worker.postMessage({ sentence, word })
worker.onmessage = (e) => setValidation(e.data)
```

### AbortController for Cancellation
Cancel pending requests when navigating:
```typescript
useEffect(() => {
  const controller = new AbortController()
  
  fetch('/api/cards', { signal: controller.signal })
    .then(handleData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err
    })
    
  return () => controller.abort()
}, [])
```

## Image Optimization

### 1. Lazy Loading
```typescript
<img 
  loading="lazy" 
  src={imageUrl} 
  alt={alt}
  width={200}
  height={150}
/>
```

### 2. SVG Sprite
Bundle commonly used icons:
```xml
<!-- icons-sprite.svg -->
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="icon-check" viewBox="0 0 24 24">
    <!-- path data -->
  </symbol>
</svg>

<!-- Usage -->
<svg><use href="/icons-sprite.svg#icon-check" /></svg>
```

### 3. Proper Dimensions
Always specify width/height to prevent layout shift

## CSS Optimization

### 1. CSS Containment
For complex cards:
```css
.session-card {
  contain: layout style paint;
}
```

### 2. Will-Change (Cautious Use)
Only for animated elements:
```css
.animating-element {
  will-change: transform;
}

.animating-element:not(.active) {
  will-change: auto; /* Reset after animation */
}
```

### 3. Reduce Repaints
Avoid layout-triggering properties in animations:
```css
/* Good: Only transform */
.slide-in {
  transform: translateX(0);
}

/* Bad: Triggers layout */
.slide-in {
  left: 0;
}
```

## Bundle Optimization

### 1. Next.js Configuration
```typescript
// next.config.ts
export default {
  compress: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
        },
      },
    }
    return config
  },
}
```

### 2. Tree-Shaking
Import only what you need:
```typescript
// Bad
import _ from 'lodash'

// Good
import debounce from 'lodash/debounce'
```

### 3. Dynamic Imports for Heavy Libraries
```typescript
// Load chart library only when needed
const Chart = dynamic(() => import('chart.js'), {
  ssr: false,
})
```

## Bundle Analysis

### Tools
1. **Bundle Analyzer**:
```bash
npm run build
npm run analyze
```

2. **Lighthouse CI** for continuous monitoring

3. **Bundle Buddy** for duplicate detection

### Budget Enforcement
```json
// package.json
{
  "budgets": [
    {
      "path": "/_next/**/*.js",
      "max": "400kb",
      "warning": "350kb"
    }
  ]
}
```

## Monitoring & Measurement

### Key Metrics to Track
1. **TTI** (Time to Interactive): < 3s
2. **FID** (First Input Delay): < 100ms
3. **LCP** (Largest Contentful Paint): < 2.5s
4. **CLS** (Cumulative Layout Shift): < 0.1
5. **Bundle Size**: Track over time

### Tools
- Chrome DevTools Performance tab
- Lighthouse
- Web Vitals extension
- Real User Monitoring (RUM) with Vercel Analytics

## Implementation Priority

### Phase 1 (High Impact)
1. ✅ Settings Context (reduce prop drilling)
2. ✅ Request-level caching with React Query
3. Code-split Settings, Session, Test pages
4. Prefetch next card in sessions

### Phase 2 (Medium Impact)  
5. List virtualization on Dashboard
6. Memoize expensive components
7. Image optimization (lazy loading, proper dimensions)
8. Bundle analysis and tree-shaking

### Phase 3 (Low Impact / Future)
9. Web Worker for AI validation
10. SVG sprite for icons
11. CSS containment for cards
12. Advanced caching strategies

## Expected Results

### After Phase 1
- Session start: ~1.8s (mobile 4G) ✅ Target: < 2s
- Home load: ~2.2s (mobile 4G)
- Bundle: ~400KB (-20%)

### After Phase 2
- Session start: ~1.3s (mobile 4G) ✅ Target achieved
- Home load: ~1.5s (mobile 4G) ✅ Target achieved  
- Next card: ~200ms ✅ Target achieved
- Bundle: ~350KB (-30%)

### After Phase 3
- All targets exceeded
- 60fps scrolling everywhere
- Bundle: ~320KB (-35%)
