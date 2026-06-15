---
name: fivem-react-nui
description: Builds NUI interfaces for FiveM using React 18 + TypeScript + Vite + Tailwind CSS v3 + Zustand. Use when the user mentions NUI, interface, UI, menu, HUD, panel, overlay, React, Vite, Tailwind, or any in-game interface for FiveM — regardless of the backend framework (vRP, QBCore, Qbox, ESX). Covers project structure, FiveM CEF restrictions, observe/Post hooks, VisibilityProvider, animations, dynamic config/theme, and performance rules.
---

# FiveM NUI — React + Vite

Stack: **React 18 + TypeScript + Vite + Tailwind CSS v3.4.17 + Zustand**

## Fundamental Rules

- `base: "./"` in `vite.config.ts` — **MANDATORY** for assets to load in FiveM
- Use `rem` for ALL sizes — NEVER `px` for layout (scales with player resolution)
- **Tailwind v4 uses OKLCH**, which FiveM CEF does not support — **use Tailwind v3.4.17**
- FORBIDDEN: `backdrop-filter: blur()`, `filter: blur()`, `filter: drop-shadow()` — cause FPS drop
- FORBIDDEN: framer-motion, GSAP, react-spring — use pure CSS transitions/keyframes
- Global `overflow: hidden` and `user-select: none`
- Independent modules (Notify, Progress, HUD) outside `VisibilityProvider`
- Main interface (panels, crafts, dialogs) inside `VisibilityProvider` with `SetNuiFocus`
- `isEnvBrowser()` for data mocking in dev
- Communication: `observe()` to listen to NUI messages, `Post.create()` to send callbacks

## Architecture

```tsx
// main.tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    {/* Always visible — do not block game input */}
    <NotifyComponent />
    <ProgressComponent />

    {/* Controlled by VisibilityProvider — requires NuiFocus */}
    <HashRouter>
      <VisibilityProvider>
        <AppContent />
      </VisibilityProvider>
    </HashRouter>
  </ThemeProvider>
);
```

## NUI Hooks

### observe — Listen to Lua messages
```typescript
observe<NotifyData>("module:notify", (data) => {
  addNotify(data);
});
```

### Post — Send callbacks to Lua
```typescript
await Post.create("buy", { item: "water", qty: 1 });
```

### Lua side
```lua
-- Open
SendNUIMessage({ action = "setNui", nui = "panel", data = { ... } })
SetNuiFocus(true, true)

-- Close callback
RegisterNUICallback("removeFocus", function(data, cb)
    SetNuiFocus(false, false)
    cb("ok")
end)
```

## fxmanifest.lua Integration

```lua
ui_page "src/ui/build/index.html"

files {
    "src/ui/build/index.html",
    "src/ui/build/assets/*",
    "src/ui/project/public/**/*",
}
```

## Recommended Dependencies

```json
{
  "dependencies": {
    "react": "^18", "react-dom": "^18",
    "react-router-dom": "^7", "zustand": "^4",
    "clsx": "^2", "tailwind-merge": "^3",
    "lucide-react": "^0.5", "tailwindcss": "^3",
    "autoprefixer": "^10", "postcss": "^8"
  },
  "devDependencies": {
    "@vitejs/plugin-react-swc": "^3",
    "typescript": "^5", "vite": "^5"
  }
}
```

Avoid: MUI, Chakra UI, Ant Design, framer-motion, styled-components — all too heavy for FiveM CEF.

For the full implementation guide (project structure, vite.config, responsive system, CSS restrictions, hooks source, Visibility/Animation/Theme providers, debugger): [ui-guide.md](ui-guide.md)
