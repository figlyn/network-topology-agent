# Widget Development Guide

Complete reference for building ChatGPT App widgets with React and the `window.openai` API.

## window.openai API Reference

The host injects `window.openai` into your widget iframe with these capabilities:

### Data Access

```typescript
// Tool input (arguments passed when tool was invoked)
const input = window.openai.toolInput;
// Type: Record<string, unknown>

// Tool output (structuredContent from response)
const output = window.openai.toolOutput;
// Type: Record<string, unknown>

// Response metadata (_meta from response, hidden from model)
const meta = window.openai.toolResponseMetadata;
// Type: Record<string, unknown>

// Persisted widget state
const state = window.openai.widgetState;
// Type: Record<string, unknown> | null
```

### State Management

```typescript
// Persist state (survives widget re-renders within same flow)
window.openai.setWidgetState({
  selectedId: "item-123",
  viewMode: "grid",
  filters: { status: "active" }
});
// Note: State is visible to model, keep under ~4k tokens
```

### Tool Invocation

```typescript
// Call another tool from the widget
await window.openai.callTool("myapp_refresh_items", {
  status: "active"
});
// Requires tool to have "openai/widgetAccessible": true

// Send a message as if user typed it
await window.openai.sendFollowUpMessage({
  prompt: "Now show me the completed items"
});
```

### Layout Control

```typescript
// Report widget height for proper sizing
window.openai.notifyIntrinsicHeight(450);

// Request display mode change
await window.openai.requestDisplayMode({ mode: "fullscreen" });
// Modes: "inline", "expanded", "pip" (picture-in-picture), "fullscreen"

// Open external link (must be in redirect_domains CSP)
window.openai.openExternal({ href: "https://myapp.com/settings" });

// Close the widget
window.openai.requestClose();
```

### Context Signals

```typescript
// Theme (for dark mode support)
const theme = window.openai.theme; // "light" | "dark"

// Current display mode
const mode = window.openai.displayMode;

// Maximum height available
const maxHeight = window.openai.maxHeight;

// User's locale
const locale = window.openai.locale; // e.g., "en-US"
```

---

## React Hooks

### useToolOutput Hook
```typescript
export function useToolOutput<T = Record<string, unknown>>(): T {
  return window.openai?.toolOutput as T;
}

// Usage
interface MyOutput {
  items: Array<{ id: string; title: string }>;
  total: number;
}

function ItemList() {
  const { items, total } = useToolOutput<MyOutput>();
  return (
    <div>
      <p>Showing {items.length} of {total}</p>
      {items.map(item => <div key={item.id}>{item.title}</div>)}
    </div>
  );
}
```

### useTheme Hook
```typescript
export function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => window.openai?.theme || "light"
  );

  useEffect(() => {
    const handler = () => setTheme(window.openai?.theme || "light");
    window.addEventListener("openai:set_globals", handler);
    return () => window.removeEventListener("openai:set_globals", handler);
  }, []);

  return theme;
}
```

---

## Component Patterns

### Dynamic Height
```typescript
function AutoHeightContainer({ children }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current && typeof window.openai?.notifyIntrinsicHeight === "function") {
        window.openai.notifyIntrinsicHeight(containerRef.current.scrollHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
```

---

## Dark Mode Support

Use CSS variable architecture:

```css
:root {
  --gray-0: #ffffff;
  --gray-100: #f5f5f5;
  --gray-900: #171717;

  --color-text: var(--gray-900);
  --color-bg: var(--gray-0);
  --color-bg-soft: var(--gray-100);
}

.dark-mode {
  --color-text: var(--gray-0);
  --color-bg: var(--gray-900);
  --color-bg-soft: var(--gray-800);
}

.card {
  background: var(--color-bg-soft);
  color: var(--color-text);
}
```

Theme detection:
```javascript
function updateTheme() {
  const theme = window.openai?.theme || 'light';
  document.body.classList.toggle('dark-mode', theme === 'dark');
}

updateTheme();
window.addEventListener('openai:set_globals', updateTheme);
```

---

## Common Widget Gotchas

### SVG Animation: CSS vs Attributes

CSS styles **override** SVG presentation attributes.

```javascript
// ❌ WRONG - CSS styles override this!
progressFill.setAttribute('stroke-dashoffset', offset);

// ✅ CORRECT - Modifies computed style
progressFill.style.strokeDashoffset = offset;
```

### Dark Mode Gray Scale Inversion

The Apps SDK UI gray scale **inverts** in dark mode:

| Variable | Light Mode | Dark Mode |
|----------|------------|-----------|
| `--gray-100` | Light | **Dark** |
| `--gray-900` | Dark | **Light** |

Use the **same variable** for both modes - it auto-inverts.

### Loading State Re-initialization Bug

Guard against re-initialization:

```javascript
let loadingInitialized = false;

function initLoadingAnimation() {
  if (loadingInitialized) return;
  loadingInitialized = true;
  // Set up timers, intervals, etc.
}
```

---

## Best Practices

1. **Keep state minimal** - Widget state is visible to model, keep under 4k tokens
2. **Handle null states** - `widgetState` can be null on first render
3. **Report height changes** - Call `notifyIntrinsicHeight` when content changes
4. **Support dark mode** - Use `useTheme()` and CSS variables
5. **Be responsive** - Widget runs on mobile too
6. **Handle loading states** - Show feedback during tool calls
7. **Use typeof checks** - Always check `typeof window.openai?.method === "function"`
