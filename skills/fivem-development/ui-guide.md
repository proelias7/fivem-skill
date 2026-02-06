# Guia de Construção de UI — FiveM (React + Vite)

Stack padrão: **React 18 + TypeScript + Vite + Tailwind CSS + Zustand**

---

## 1. Estrutura de Projeto

```
meu-resource/
├── src/
│   └── ui/
│       ├── project/              # Código fonte da UI
│       │   ├── index.html
│       │   ├── vite.config.ts
│       │   ├── package.json
│       │   ├── tailwind.config.js
│       │   ├── postcss.config.js
│       │   ├── tsconfig.json
│       │   ├── public/
│       │   │   └── config.ui.json    # Configurações de tema/imagens
│       │   └── src/
│       │       ├── main.tsx
│       │       ├── types.ts
│       │       ├── style/
│       │       │   └── global.css
│       │       ├── hooks/            # Comunicação com FiveM
│       │       │   ├── listen.ts     # Listener de eventos DOM
│       │       │   ├── observe.ts    # Listener de mensagens NUI
│       │       │   ├── post.ts       # Envio de NUI callbacks
│       │       │   └── useConfig.ts  # Carregamento de config.ui.json
│       │       ├── providers/
│       │       │   ├── Visibility.tsx # Controle de visibilidade/focus
│       │       │   ├── Animation.tsx  # Transições de entrada/saída
│       │       │   └── Theme.tsx      # Tema dinâmico via CSS vars
│       │       ├── stores/           # Zustand stores
│       │       ├── components/       # Componentes da interface
│       │       └── utils/
│       │           ├── misc.ts       # isEnvBrowser, cn()
│       │           └── debugger.ts   # Mock de eventos NUI no browser
│       └── build/                # Output do Vite (gerado)
│           ├── index.html
│           └── assets/
├── client/
├── server/
└── fxmanifest.lua
```

## 2. Configuração do Vite (Crítico para FiveM)

```typescript
// vite.config.ts
import * as path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "./",           // OBRIGATÓRIO: paths relativos para funcionar no FiveM
  build: {
    outDir: "../build",  // Output fora do project/ para o fxmanifest
    sourcemap: false,    // Não gerar sourcemaps em produção
    minify: "esbuild",   // esbuild é mais rápido que terser
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
});
```

**REGRAS DO VITE:**
- `base: "./"` é **OBRIGATÓRIO** — sem isso, os assets não carregam no FiveM
- `outDir: "../build"` — build fica fora do project para o fxmanifest referenciar
- `sourcemap: false` — não expor código fonte
- Usar `@vitejs/plugin-react-swc` (mais rápido que babel)

**Scripts do package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build --emptyOutDir"
  }
}
```

## 3. Integração com fxmanifest.lua

```lua
ui_page "src/ui/build/index.html"

files {
    "src/ui/build/index.html",
    "src/ui/build/assets/*",
    "src/ui/project/public/**/*",  -- config.ui.json e imagens
}
```

## 4. Sistema de Proporções para Tela In-Game

O FiveM renderiza em diversas resoluções. Usar `rem` + media queries no `html` font-size:

```css
/* global.css — Sistema de escala responsiva */
html {
  font-size: 100% !important;  /* Base: 1920x1080 */
}

/* Escala por largura */
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

/* Escala por altura */
@media screen and (max-height: 950px) { html { font-size: 90% !important; } }
@media screen and (max-height: 900px) { html { font-size: 86% !important; } }
@media screen and (max-height: 860px) { html { font-size: 80% !important; } }
@media screen and (max-height: 800px) { html { font-size: 75% !important; } }
@media screen and (max-height: 750px) { html { font-size: 60% !important; } }
@media screen and (max-height: 700px) { html { font-size: 60% !important; } }

/* Ultrawide */
@media screen and (min-aspect-ratio: 21/9) { html { font-size: 110% !important; } }

/* Minimap (quando NUI está em elementos pequenos) */
@media screen and (max-width: 100px) and (max-height: 100px) {
  html { font-size: 5.5% !important; }
}
```

**REGRA:** SEMPRE use `rem` para tamanhos (width, height, padding, margin, font-size, gap, border-radius). NUNCA `px` para layout, pois não escala com a resolução do jogador.

## 5. CSS Base Obrigatório para FiveM

```css
* {
  margin: 0;
  padding: 0;
  outline: none;
  overflow: hidden;       /* Evita scrollbars no jogo */
  user-select: none;      /* Impede seleção de texto */
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

**Por que cada propriedade:**
- `overflow: hidden` — scrollbars quebram a UI no FiveM
- `user-select: none` — impede seleção de texto acidental
- `transition: all ease 0.25s` — suaviza todas as mudanças de estado
- Font smoothing — texto mais nítido no CEF do FiveM

## 6. Restrições de CSS no FiveM (CEF)

O FiveM usa **Chromium Embedded Framework (CEF)** com limitações:

### PROIBIDO (não funciona ou causa lag)

| Propriedade | Problema |
|-------------|----------|
| `backdrop-filter: blur()` | **Extremamente pesado** — causa queda de FPS |
| `filter: blur()` | Pesado em elementos que mudam |
| `filter: drop-shadow()` | Pesado, usar `box-shadow` no lugar |
| `mix-blend-mode` | Inconsistente no CEF |
| `-webkit-backdrop-filter` | Mesmo problema do backdrop-filter |
| `will-change` em excesso | Memory leak no CEF |

### USAR COM CUIDADO

| Propriedade | Quando usar |
|-------------|-------------|
| `backdrop-filter: blur()` | **Apenas** em modais estáticos que cobrem a tela (uso mínimo) |
| `box-shadow` complexo | Apenas em elementos estáticos, não em listas/scroll |
| `animation` | Preferir CSS puro, evitar libs JS de animação |
| `transform` | OK para animações, evitar `transform3d` |

### ALTERNATIVAS SEGURAS

```css
/* Em vez de backdrop-filter: blur() */
.bg-modal-overlay {
  background: rgba(16, 16, 16, 0.7);   /* Opacidade no lugar de blur */
}

/* Em vez de filter: drop-shadow() */
.card {
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
}

/* Gradientes são leves e ficam bonitos */
.bg-main {
  background: linear-gradient(
    293deg,
    rgba(var(--main-color), 0) 82%,
    rgba(var(--main-color), 0.13) 127%
  ), rgb(20, 21, 31);
}
```

## 7. Hooks de Comunicação NUI

### observe — Ouvir mensagens do Lua

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

**Uso:**
```tsx
// Ouve evento "module:notify" vindo do Lua
observe<NotifyData>("module:notify", (data) => {
  addNotify(data);
});
```

### Post — Enviar callbacks para o Lua

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
      return mockData;  // Mock no browser para dev
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

**Uso:**
```tsx
// Envia callback para o Lua (RegisterNUICallback)
await Post.create("comprar", { item: "agua", qtd: 1 });

// Com mock para desenvolvimento no browser
const dados = await Post.create<UserData>("GetUserData", {}, mockUserData);
```

### listen — Ouvir eventos DOM

```typescript
// hooks/listen.ts — para keyboard, mouse, etc.
export const listen = <T extends Event = Event>(
  event: string,
  handler: (event: T) => void,
  target: EventTarget = window,
) => { /* ... */ };
```

**Uso:**
```tsx
listen<KeyboardEvent>("keydown", (e) => {
  if (e.code === "Escape") fecharInterface();
});
```

### isEnvBrowser — Detectar ambiente

```typescript
// utils/misc.ts
export const isEnvBrowser = (): boolean => !(window as any).invokeNative;
```

Retorna `true` no browser (dev), `false` no FiveM (prod). Usar para:
- Mock de dados no dev
- Background de debug
- Logs condicionais

## 8. Sistema de Visibilidade

Padrão para controlar abrir/fechar NUI com focus:

```tsx
// providers/Visibility.tsx (padrão simplificado)

// FORMATO DE EVENTOS:
// Abrir: { action: "setNui", nui: "panel" | "craft" | "dialog", data: {...} }
// Fechar: { action: "closeNui", nui?: "panel" | "craft" | "dialog" }

export const VisibilityProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<UIMode>(null);

  // Listener de mensagens NUI
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { action, nui, data } = event.data;
      if (action === "setNui" && nui) {
        setMode(nui);
        setVisible(true);
        // Carregar dados no store se necessário
      }
      if (action === "closeNui") {
        setMode(null);
        setVisible(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Remove NuiFocus quando fecha
  useEffect(() => {
    if (!visible && !isEnvBrowser()) {
      Post.create("removeFocus");
    }
  }, [visible]);

  // ESC para fechar
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

**Lado Lua (client):**
```lua
-- Abrir
SendNUIMessage({ action = "setNui", nui = "panel", data = { ... } })
SetNuiFocus(true, true)

-- Callback de fechar (chamado pela UI via Post.create("removeFocus"))
RegisterNUICallback("removeFocus", function(data, cb)
    SetNuiFocus(false, false)
    cb("ok")
end)
```

## 9. Animação de Entrada/Saída

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

**REGRA:** Usar CSS transitions/animations puras. NÃO usar framer-motion, react-spring ou libs de animação pesadas.

## 10. Config Dinâmica (Tema/Imagens)

```json
// public/config.ui.json
{
  "theme": "104, 44, 242",
  "defaultAvatar": "https://url/avatar.png",
  "imageDirectory": "https://url/inventario"
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

**Tema via CSS Variables:**
```css
:root { --main-color: 0, 0, 0; }
```

```javascript
// Aplicar tema dinâmico
document.documentElement.style.setProperty("--main-color", config.theme);
```

```javascript
// tailwind.config.js — cor dinâmica com opacidade
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

// Uso no Tailwind: bg-primary, text-primary, border-primary
colors: { primary: withOpacity("--main-color") }
```

## 11. Debugger para Desenvolvimento

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

**Uso no main.tsx:**
```tsx
new Debugger([
  { action: "module:notify", data: { title: "Teste", type: "success", description: "OK", delay: 5000 }, delay: 500 },
  { action: "setNui", nui: "panel", delay: 1000 },
]);
```

Permite testar toda a UI no browser sem o FiveM rodando.

## 12. Arquitetura de Componentes

### Módulos Independentes vs Interface Principal

```tsx
// main.tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    {/* Módulos independentes — SEMPRE visíveis, não bloqueiam o jogo */}
    <NotifyComponent />
    <ProgressComponent />
    <Hoverfy />
    <RequestComponent />
    <DynamicMenu />

    {/* Interface principal — controlada por VisibilityProvider */}
    <HashRouter>
      <VisibilityProvider>
        <AppContent />
      </VisibilityProvider>
    </HashRouter>
  </ThemeProvider>
);
```

**Regra de separação:**
- **Módulos independentes:** Notify, ProgressBar, Hoverfy, Request — aparecem sem NuiFocus, não bloqueiam input do jogador
- **Interface principal:** Painéis, crafts, diálogos — requerem NuiFocus, bloqueiam input

### AppContent (Renderização por Modo)

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

## 13. Boas Práticas de Performance

### FAZER

- Usar `rem` para todos os tamanhos (escala com resolução)
- CSS animations puras (keyframes) para enter/exit
- `esbuild` como minifier no Vite
- Zustand para estado global (leve, sem boilerplate)
- Componentes pequenos e focados
- `overflow: hidden` global
- Gradientes lineares/radiais para backgrounds (leves)
- `opacity` para transições de visibilidade
- `transform: translate/scale` para animações

### NÃO FAZER

- `backdrop-filter: blur()` (FPS killer)
- `filter: blur()` em elementos dinâmicos
- `filter: drop-shadow()` (usar `box-shadow`)
- Libs de animação pesadas (framer-motion, GSAP, react-spring)
- `px` para layout (não escala)
- `overflow: auto/scroll` visível (scrollbar aparece no jogo)
- Imagens grandes sem compressão
- `setInterval`/`setTimeout` sem cleanup
- `will-change` em muitos elementos
- Fontes externas sem fallback

### Dependências Recomendadas

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

**Pacotes leves e compatíveis.** Evitar: MUI, Chakra UI, Ant Design, framer-motion, styled-components (todos pesados demais para FiveM).
