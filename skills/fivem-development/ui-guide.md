# UI Construction Guide — FiveM (React + Vite)

Standard Stack: **React 18 + TypeScript + Vite + Tailwind CSS + Zustand**

> **FiveM Compatibility (CEF):** **Tailwind v4** uses colors in **OKLCH**, and the current FiveM CEF **does not support OKLCH**.
> **Recommendation:** use **Tailwind v3.4.17** (latest v3) to avoid rendering issues.

---

## 1. Project Structure

```
my-resource/
├── src/
│   └── ui/
│       ├── project/              # UI source code
│       │   ├── index.html
│       │   ├── vite.config.ts
│       │   ├── package.json
│       │   ├── tailwind.config.js
│       │   ├── postcss.config.js
│       │   ├── tsconfig.json
│       │   ├── public/
│       │   │   └── config.ui.json    # Theme/image configurations
│       │   └── src/
│       │       ├── main.tsx
│       │       ├── types.ts
│       │       ├── style/
│       │       │   └── global.css
│       │       ├── hooks/            # Communication with FiveM
│       │       │   ├── listen.ts     # DOM event listener
│       │       │   ├── observe.ts    # NUI message listener
│       │       │   ├── post.ts       # Send NUI callbacks
│       │       │   └── useConfig.ts  # Load config.ui.json
│       │       ├── providers/
│       │       │   ├── Visibility.tsx # Visibility/focus control
│       │       │   ├── Animation.tsx  # Enter/exit transitions
│       │       │   └── Theme.tsx      # Dynamic theme via CSS vars
│       │       ├── stores/           # Zustand stores
│       │       ├── components/       # Interface components
│       │       └── utils/
│       │           ├── misc.ts       # isEnvBrowser, cn()
│       │           └── debugger.ts   # Mock NUI events in browser
│       └── build/                # Vite output (generated)
│           ├── index.html
│           └── assets/
├── client/
├── server/
└── fxmanifest.lua
```

## 2. Vite Configuration (Critical for FiveM)

```typescript
// vite.config.ts
import * as path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "./",           // MANDATORY: relative paths to work in FiveM
  build: {
    outDir: "../build",  // Output outside project/ for fxmanifest
    sourcemap: false,    // Do not generate sourcemaps in production
    minify: "esbuild",   // esbuild is faster than terser
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
});
```

**VITE RULES:**
- `base: "./"` is **MANDATORY** — without it, assets do not load in FiveM
- `outDir: "../build"` — build stays outside project for fxmanifest to reference
- `sourcemap: false` — do not expose source code
- Use `@vitejs/plugin-react-swc` (faster than babel)

**package.json Scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build --emptyOutDir"
  }
}
```

## 3. Integration with fxmanifest.lua

```lua
ui_page "src/ui/build/index.html"

files {
    "src/ui/build/index.html",
    "src/ui/build/assets/*",
    "src/ui/project/public/**/*",  -- config.ui.json and images
}
```

## 4. In-Game Screen Proportions System

FiveM renders in various resolutions. Use `rem` + media queries in `html` font-size:

```css
/* global.css — Responsive scale system */
html {
  font-size: 100% !important;  /* Base: 1920x1080 */
}

/* Scale by width */
@media screen and (max-width: 1900px) { html { font-size: 88% !important; } }
@media screen and (max-width: 1570px) { html { font-size: 75% !important; } }
@media screen and (max-width: 1450px) { html { font-size: 70% !important; } }
@media screen and (max-width: 1400px) { html { font-size: 70% !important; } }
@media screen and (max-width: 1260px) { html { font-size: 65% !important; } }
@media screen and (max-width: 1180px) { html { font-size: 60% !important; } }
@media screen and (max-width: 1070px) { html { font-size: 55% !important; } }
@media screen and (max-width: 990px)  { html { font-size: 50% !important; } }
@media screen and (max-width: 900px)  { html { font-size: 45% !important; } }
@media screen and (max-width: 800px)  { html { font-size: 40% !important; } }
@media screen and (max-width: 690px)  { html { font-size: 35% !important; } }
@media screen and (max-width: 630px)  { html { font-size: 30% !important; } }

/* Scale by height */
@media screen and (max-height: 950px) { html { font-size: 90% !important; } }
@media screen and (max-height: 900px) { html { font-size: 86% !important; } }
@media screen and (max-height: 860px) { html { font-size: 80% !important; } }
@media screen and (max-height: 800px) { html { font-size: 75% !important; } }
@media screen and (max-height: 750px) { html { font-size: 60% !important; } }
@media screen and (max-height: 700px) { html { font-size: 60% !important; } }

/* Ultrawide */
@media screen and (min-aspect-ratio: 21/9) { html { font-size: 110% !important; } }

/* Minimap (when NUI is in small elements) */
@media screen and (max-width: 100px) and (max-height: 100px) {
  html { font-size: 5.5% !important; }
}
```

**RULE:** ALWAYS use `rem` for sizes (width, height, padding, margin, font-size, gap, border-radius). NEVER `px` for layout, as it does not scale with player resolution.

## 5. Mandatory Base CSS for FiveM

```css
* {
  margin: 0;
  padding: 0;
  outline: none;
  overflow: hidden;       /* Avoids scrollbars in game */
  user-select: none;      /* Prevents text selection */
  box-sizing: border-box;
  border: none;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  transition: all ease 0.25s;
  font-family: "Montserrat", sans-serif;
  scroll-behavior: smooth;
}
```

**Why each property:**
- `overflow: hidden` — scrollbars break UI in FiveM
- `user-select: none` — prevents accidental text selection
- `transition: all ease 0.25s` — smooths all state changes
- Font smoothing — sharper text in FiveM CEF

## 6. CSS Restrictions in FiveM (CEF)

FiveM uses **Chromium Embedded Framework (CEF)** with limitations:

### FORBIDDEN (does not work or causes lag)

| Property | Problem |
|-------------|----------|
| `backdrop-filter: blur()` | **Extremely heavy** — causes FPS drop |
| `filter: blur()` | Heavy on changing elements |
| `filter: drop-shadow()` | Heavy, use `box-shadow` instead |
| `mix-blend-mode` | Inconsistent in CEF |
| `-webkit-backdrop-filter` | Same problem as backdrop-filter |
| `will-change` in excess | Memory leak in CEF |

### USE WITH CAUTION

| Property | When to use |
|-------------|-------------|
| `backdrop-filter: blur()` | **Only** in static modals covering the screen (minimal use) |
| Complex `box-shadow` | Only on static elements, not lists/scroll |
| `animation` | Prefer pure CSS, avoid JS animation libs |
| `transform` | OK for animations, avoid `transform3d` |

### SAFE ALTERNATIVES

```css
/* Instead of backdrop-filter: blur() */
.bg-modal-overlay {
  background: rgba(16, 16, 16, 0.7);   /* Opacity instead of blur */
}

/* Instead of filter: drop-shadow() */
.card {
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
}

/* Gradients are light and look good */
.bg-main {
  background: linear-gradient(
    293deg,
    rgba(var(--main-color), 0) 82%,
    rgba(var(--main-color), 0.13) 127%
  ), rgb(20, 21, 31);
}
```

## 7. NUI Communication Hooks

### observe — Listen to messages from Lua

```typescript
// hooks/observe.ts
import { MutableRefObject, useEffect, useRef } from "react";
import { isEnvBrowser, noop } from "@/utils/misc";
import type { NuiMessageDataFrame } from "@/types";

type NuiHandlerSignature<T> = (data: T) => void;

class NuiListener<T> {
  private action: string;
  private savedHandler: MutableRefObject<NuiHandlerSignature<T>>;

  constructor(action: string, handler: NuiHandlerSignature<T>) {
    this.action = action;
    this.savedHandler = useRef<NuiHandlerSignature<T>>(noop);
    this.setHandler(handler);
  }

  setHandler(handler: NuiHandlerSignature<T>) {
    this.savedHandler.current = handler;
  }

  observe() {
    const eventListener = (event: MessageEvent<NuiMessageDataFrame<T>>) => {
      const { action: eventAction, data } = event.data;
      if (eventAction === this.action && this.savedHandler.current) {
        this.savedHandler.current(data);
      }
    };
    window.addEventListener("message", eventListener);
    return () => window.removeEventListener("message", eventListener);
  }
}

export const observe = <T = unknown>(
  action: string,
  handler: (data: T) => void,
) => {
  const listener = useRef(new NuiListener<T>(action, handler));
  useEffect(() => { listener.current.setHandler(handler); }, [handler]);
  useEffect(() => { return listener.current.observe(); }, [action]);
};
```

**Usage:**
```tsx
// Listens to "module:notify" event coming from Lua
observe<NotifyData>("module:notify", (data) => {
  addNotify(data);
});
```

### Post — Send callbacks to Lua

```typescript
// hooks/post.ts
import { isEnvBrowser } from "@/utils/misc";

export class Post<T = unknown> {
  public static async create<T>(
    eventName: string,
    data?: unknown,
    mockData?: T,
  ): Promise<T> {
    if (isEnvBrowser() && mockData !== undefined) {
      return mockData;  // Mock in browser for dev
    }

    const resourceName = (window as any).GetParentResourceName
      ? (window as any).GetParentResourceName()
      : "nui-frame-app";

    const resp = await fetch(`https://${resourceName}/${eventName}`, {
      method: "post",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data),
    });
    return resp.json();
  }
}
```

**Usage:**
```tsx
// Sends callback to Lua (RegisterNUICallback)
await Post.create("buy", { item: "water", qty: 1 });

// With mock for browser development
const data = await Post.create<UserData>("GetUserData", {}, mockUserData);
```

### listen — Listen to DOM events

```typescript
// hooks/listen.ts — for keyboard, mouse, etc.
export const listen = <T extends Event = Event>(
  event: string,
  handler: (event: T) => void,
  target: EventTarget = window,
) => { /* ... */ };
```

**Usage:**
```tsx
listen<KeyboardEvent>("keydown", (e) => {
  if (e.code === "Escape") closeInterface();
});
```

### isEnvBrowser — Detect environment

```typescript
// utils/misc.ts
export const isEnvBrowser = (): boolean => !(window as any).invokeNative;
```

Returns `true` in browser (dev), `false` in FiveM (prod). Use for:
- Mocking data in dev
- Debug background
- Conditional logs

## 8. Visibility System

Pattern to control open/close NUI with focus:

```tsx
// providers/Visibility.tsx (simplified pattern)

// EVENT FORMAT:
// Open: { action: "setNui", nui: "panel" | "craft" | "dialog", data: {...} }
// Close: { action: "closeNui", nui?: "panel" | "craft" | "dialog" }

export const VisibilityProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<UIMode>(null);

  // NUI message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { action, nui, data } = event.data;
      if (action === "setNui" && nui) {
        setMode(nui);
        setVisible(true);
        // Load data into store if needed
      }
      if (action === "closeNui") {
        setMode(null);
        setVisible(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Remove NuiFocus when closed
  useEffect(() => {
    if (!visible && !isEnvBrowser()) {
      Post.create("removeFocus");
    }
  }, [visible]);

  // ESC to close
  listen<KeyboardEvent>("keydown", (e) => {
    if (visible && e.code === "Escape") {
      setVisible(false);
      setMode(null);
    }
  });

  return (
    <VisibilityContext.Provider value={{ visible, setVisible, mode, setMode }}>
      <AnimationProvider show={visible}>
        {children}
      </AnimationProvider>
    </VisibilityContext.Provider>
  );
};
```

**Lua Side (client):**
```lua
-- Open
SendNUIMessage({ action = "setNui", nui = "panel", data = { ... } })
SetNuiFocus(true, true)

-- Close callback (called by UI via Post.create("removeFocus"))
RegisterNUICallback("removeFocus", function(data, cb)
    SetNuiFocus(false, false)
    cb("ok")
end)
```

## 9. Enter/Exit Animation

```tsx
// providers/Animation.tsx
const duration = 200;

export const AnimationProvider = ({ children, show = false }) => {
  const [status, setStatus] = useState("unmounted");

  useEffect(() => {
    if (show) {
      setStatus("entering");
      setTimeout(() => setStatus("entered"), 0);
    } else {
      setStatus("exiting");
      setTimeout(() => setStatus("exited"), duration);
    }
  }, [show]);

  useEffect(() => {
    if (status === "exited") setStatus("unmounted");
  }, [status]);

  if (status === "unmounted") return null;

  return (
    <div style={{
      opacity: status === "entered" ? 1 : 0,
      transition: `opacity ${duration}ms ease`,
    }}>
      {children}
    </div>
  );
};
```

**RULE:** Use pure CSS transitions/animations. DO NOT use framer-motion, react-spring or heavy animation libs.

## 10. Dynamic Config (Theme/Images)

```json
// public/config.ui.json
{
  "theme": "104, 44, 242",
  "defaultAvatar": "https://url/avatar.png",
  "imageDirectory": "https://url/inventory"
}
```

```typescript
// hooks/useConfig.ts
let configCache: Config | null = null;

export function useConfig(): Config | null {
  const [config, setConfig] = useState<Config | null>(configCache);
  useEffect(() => {
    fetch("./config.ui.json")
      .then(r => r.json())
      .then(data => { configCache = data; setConfig(data); });
  }, []);
  return config;
}
```

**Theme via CSS Variables:**
```css
:root { --main-color: 0, 0, 0; }
```

```javascript
// Apply dynamic theme
document.documentElement.style.setProperty("--main-color", config.theme);
```

```javascript
// tailwind.config.js — dynamic color with opacity
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

// Usage in Tailwind: bg-primary, text-primary, border-primary
colors: { primary: withOpacity("--main-color") }
```

## 11. Debugger for Development

```typescript
// utils/debugger.ts
export class Debugger {
  constructor(events: NuiDebugEventFrame[]) {
    if (isEnvBrowser()) {
      events.forEach((event) => {
        setTimeout(() => {
          const { delay, ...eventData } = event;
          window.dispatchEvent(new MessageEvent("message", { data: eventData }));
        }, event.delay ?? 1000);
      });
    }
  }
}
```

**Usage in main.tsx:**
```tsx
new Debugger([
  { action: "module:notify", data: { title: "Test", type: "success", description: "OK", delay: 5000 }, delay: 500 },
  { action: "setNui", nui: "panel", delay: 1000 },
]);
```

Allows testing the entire UI in browser without FiveM running.

## 12. Component Architecture

### Independent Modules vs Main Interface

```tsx
// main.tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    {/* Independent modules — ALWAYS visible, do not block game */}
    <NotifyComponent />
    <ProgressComponent />
    <Hoverfy />
    <RequestComponent />
    <DynamicMenu />

    {/* Main interface — controlled by VisibilityProvider */}
    <HashRouter>
      <VisibilityProvider>
        <AppContent />
      </VisibilityProvider>
    </HashRouter>
  </ThemeProvider>
);
```

**Separation Rule:**
- **Independent modules:** Notify, ProgressBar, Hoverfy, Request — appear without NuiFocus, do not block player input
- **Main interface:** Panels, crafts, dialogs — require NuiFocus, block input

### AppContent (Rendering by Mode)

```tsx
export function AppContent() {
  const visibility = useContext(VisibilityContext);
  if (!visibility?.visible) return null;

  switch (visibility.mode) {
    case "panel":  return <Interface />;
    case "craft":  return <CraftOverlay />;
    case "dialog": return <DialogOverlay />;
    default:       return null;
  }
}
```

## 13. Performance Best Practices

### DO

- Use `rem` for all sizes (scales with resolution)
- Pure CSS animations (keyframes) for enter/exit
- `esbuild` as minifier in Vite
- Zustand for global state (light, no boilerplate)
- Small and focused components
- Global `overflow: hidden`
- Linear/radial gradients for backgrounds (light)
- `opacity` for visibility transitions
- `transform: translate/scale` for animations

### DO NOT

- `backdrop-filter: blur()` (FPS killer)
- `filter: blur()` on dynamic elements
- `filter: drop-shadow()` (use `box-shadow`)
- Heavy animation libs (framer-motion, GSAP, react-spring)
- `px` for layout (does not scale)
- Visible `overflow: auto/scroll` (scrollbar appears in game)
- Large images without compression
- `setInterval`/`setTimeout` without cleanup
- `will-change` on many elements
- External fonts without fallback

### Recommended Dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^7",
    "zustand": "^4",
    "clsx": "^2",
    "tailwind-merge": "^3",
    "lucide-react": "^0.5",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8"
  },
  "devDependencies": {
    "@vitejs/plugin-react-swc": "^3",
    "typescript": "^5",
    "vite": "^5"
  }
}
```

**Lightweight and compatible packages.** Avoid: MUI, Chakra UI, Ant Design, framer-motion, styled-components (all too heavy for FiveM).
