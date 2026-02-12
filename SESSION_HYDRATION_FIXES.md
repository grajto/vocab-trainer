# Session Start Hydration Error Fixes

## Problem
Sessions could not be started due to React hydration error #310:
```
Minified React error #310: Hydration failed because the initial UI 
does not match what was rendered on the server.
```

## Root Causes Identified and Fixed

### 1. ✅ SoundProvider State Initialization (CRITICAL)
**File:** `src/lib/SoundProvider.tsx`

**Problem:** State was initialized with default value, then updated in useEffect with localStorage value:
```typescript
// BEFORE - Causes hydration mismatch
const [enabled, setEnabled] = useState(true) // Server: true
useEffect(() => {
  const stored = localStorage.getItem('sound-enabled')
  if (stored !== null) setEnabled(stored === 'true') // Client: false
}, [])
// Server renders true, client renders false initially then updates → MISMATCH!
```

**Fix:** Initialize state from localStorage synchronously in useState:
```typescript
// AFTER - No mismatch
const [enabled, setEnabled] = useState(() => {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem('sound-enabled')
  return stored !== null ? stored === 'true' : true
})
// Both server and client start with same value → NO MISMATCH!
```

### 2. ✅ Session Page Shuffle State Initialization (CRITICAL)
**File:** `app/session/[id]/page.tsx`

**Problem:** Same pattern as SoundProvider - state initialized then updated in useEffect:
```typescript
// BEFORE
const [shuffleEnabled, setShuffleEnabled] = useState(false)
useEffect(() => {
  const saved = localStorage.getItem('vocab-shuffle')
  if (saved === 'true') setShuffleEnabled(true)
}, [])
```

**Fix:** Initialize from localStorage synchronously:
```typescript
// AFTER
const [shuffleEnabled, setShuffleEnabled] = useState(() => {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem('vocab-shuffle')
  return saved === 'true'
})
```

### 3. ✅ Browser API SSR Safety Guards
**Files:** `src/lib/SoundProvider.tsx`, `app/session/[id]/page.tsx`

**Problem:** Browser APIs accessed without checking if window exists:
- `new Audio()` - Audio API
- `localStorage.getItem/setItem()`
- `sessionStorage.getItem/setItem()`
- `window.addEventListener()`
- `document.addEventListener()`

**Fix:** Added `typeof window !== 'undefined'` guards to all browser API access.

### 4. ✅ AppShell Props Mismatch (SUBTLE BUT IMPORTANT)
**File:** `app/(app)/_components/AppShell.tsx`

**Problem:** Component interface declared `username` prop, but function didn't destructure it:
```typescript
// BEFORE
export function AppShell({
  folders,    // ✅ Destructured
  children,   // ✅ Destructured
  // username missing! ❌
}: {
  username: string  // Declared in interface
  folders: Array<...>
  children: ReactNode
})
```

This mismatch can cause React to handle props differently between server/client.

**Fix:** Destructure ALL props defined in interface:
```typescript
// AFTER
export function AppShell({
  username,   // ✅ Now destructured
  folders,
  children,
}: {
  username: string
  folders: Array<...>
  children: ReactNode
})
```

### 5. ✅ QueryProvider Architecture
**Files:** `app/layout.tsx`, `app/(app)/_components/AppShell.tsx`

**Problem:** QueryProvider was wrapping server components in root layout.

**Fix:** Moved QueryProvider to AppShell (client component), so it only wraps authenticated app routes.

## Key Patterns Learned

### Pattern 1: State from LocalStorage (useState Initializer)
```typescript
// ✅ CORRECT - Use useState initializer
const [value, setValue] = useState(() => {
  if (typeof window === 'undefined') return defaultValue
  return localStorage.getItem('key') || defaultValue
})

// ❌ WRONG - Don't use useEffect
const [value, setValue] = useState(defaultValue)
useEffect(() => {
  setValue(localStorage.getItem('key') || defaultValue)
}, [])
```

### Pattern 2: Browser API Access
```typescript
// ✅ CORRECT - Guard with typeof window check
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handler)
  localStorage.setItem('key', value)
}

// ❌ WRONG - Direct access
window.addEventListener('keydown', handler) // Error during SSR!
```

### Pattern 3: Props Destructuring
```typescript
// ✅ CORRECT - Destructure ALL interface props
function Component({ prop1, prop2, prop3 }: {
  prop1: string
  prop2: number
  prop3: boolean
}) { }

// ❌ WRONG - Missing props in destructuring
function Component({ prop1, prop2 }: {
  prop1: string
  prop2: number
  prop3: boolean  // Declared but not destructured
}) { }
```

## Testing the Fix

After deploying these fixes:
1. Navigate to dashboard
2. Click "Rozpocznij" on any recommended deck
3. Session should load without errors
4. No React hydration error #310 in console
5. Sound and shuffle settings should persist correctly

## Related Resources

- React Hydration Error #310: https://react.dev/errors/310
- Next.js SSR Patterns: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- React useState Initializer: https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state
