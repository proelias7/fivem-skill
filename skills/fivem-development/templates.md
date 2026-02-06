# Templates de Resources — vRP Creative Network

## Template 1: Resource Básico (Server Only)

### Estrutura

```
meu-resource/
├── fxmanifest.lua
└── server/
    └── main.lua
```

### fxmanifest.lua

```lua
fx_version "cerulean"
game "gta5"
lua54 "yes"

server_scripts {
    "server/*.lua",
}
```

### server/main.lua

```lua
-------------------------------------------------------------------------
-- SETUP
-------------------------------------------------------------------------
local Proxy = module("vrp", "lib/Proxy")
local Tunnel = module("vrp", "lib/Tunnel")

vRP = Proxy.getInterface("vRP")
vRPC = Tunnel.getInterface("vRP")
-------------------------------------------------------------------------
-- MAIN
-------------------------------------------------------------------------

-- Seu código aqui
```

---

## Template 2: Resource Client + Server

### Estrutura

```
meu-resource/
├── fxmanifest.lua
├── client/
│   └── main.lua
└── server/
    └── main.lua
```

### fxmanifest.lua

```lua
fx_version "cerulean"
game "gta5"
lua54 "yes"

shared_scripts {
    "@vrp/lib/Utils.lua",
}

client_scripts {
    "client/*.lua",
}

server_scripts {
    "server/*.lua",
}
```

### server/main.lua

```lua
-------------------------------------------------------------------------
-- SETUP
-------------------------------------------------------------------------
local Proxy = module("vrp", "lib/Proxy")
local Tunnel = module("vrp", "lib/Tunnel")

vRP = Proxy.getInterface("vRP")
vRPC = Tunnel.getInterface("vRP")

local src = {}
local cln = {}

Proxy.addInterface("meu_resource", src)
Tunnel.bindInterface("meu_resource", cln)
-------------------------------------------------------------------------
-- FUNCTIONS
-------------------------------------------------------------------------

-- Funções server-side que o client pode chamar via Tunnel
function cln.MinhaFuncao()
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- lógica
end
```

### client/main.lua

```lua
-------------------------------------------------------------------------
-- SETUP
-------------------------------------------------------------------------
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy = module("vrp", "lib/Proxy")

vRPS = Tunnel.getInterface("vRP")
SRC = Tunnel.getInterface("meu_resource")

local cln = {}
Tunnel.bindInterface("meu_resource", cln)
-------------------------------------------------------------------------
-- FUNCTIONS
-------------------------------------------------------------------------

-- Funções client-side que o server pode chamar via Tunnel
function cln.MinhaFuncaoClient()
    -- lógica client
end
```

---

## Template 3: Resource com NUI

### Estrutura

```
meu-resource/
├── fxmanifest.lua
├── client/
│   └── main.lua
├── server/
│   └── main.lua
└── html/
    ├── index.html
    ├── style.css
    └── script.js
```

### fxmanifest.lua

```lua
fx_version "cerulean"
game "gta5"
lua54 "yes"

shared_scripts {
    "@vrp/lib/Utils.lua",
}

client_scripts {
    "client/*.lua",
}

server_scripts {
    "server/*.lua",
}

ui_page "html/index.html"

files {
    "html/index.html",
    "html/style.css",
    "html/script.js",
}
```

### client/main.lua

```lua
-------------------------------------------------------------------------
-- SETUP
-------------------------------------------------------------------------
local Tunnel = module("vrp", "lib/Tunnel")
local Proxy = module("vrp", "lib/Proxy")

vRPS = Tunnel.getInterface("vRP")
SRC = Tunnel.getInterface("meu_resource")

local cln = {}
Tunnel.bindInterface("meu_resource", cln)
-------------------------------------------------------------------------
-- NUI
-------------------------------------------------------------------------
local isOpen = false

function AbrirNUI(data)
    if not isOpen then
        isOpen = true
        SetNuiFocus(true, true)
        SendNUIMessage({ action = "open", data = data })
    end
end

function FecharNUI()
    if isOpen then
        isOpen = false
        SetNuiFocus(false, false)
        SendNUIMessage({ action = "close" })
    end
end

RegisterNUICallback("fechar", function(data, cb)
    FecharNUI()
    cb("ok")
end)

RegisterNUICallback("acao", function(data, cb)
    SRC.ProcessarAcao(data)
    cb("ok")
end)
-------------------------------------------------------------------------
-- CLIENT TUNNEL
-------------------------------------------------------------------------
function cln.AbrirInterface(data)
    AbrirNUI(data)
end
```

### server/main.lua

```lua
-------------------------------------------------------------------------
-- SETUP
-------------------------------------------------------------------------
local Proxy = module("vrp", "lib/Proxy")
local Tunnel = module("vrp", "lib/Tunnel")

vRP = Proxy.getInterface("vRP")
vRPC = Tunnel.getInterface("vRP")
CLN = Tunnel.getInterface("meu_resource")

local src = {}
local cln = {}

Proxy.addInterface("meu_resource", src)
Tunnel.bindInterface("meu_resource", cln)
-------------------------------------------------------------------------
-- TUNNEL FUNCTIONS
-------------------------------------------------------------------------
function cln.ProcessarAcao(data)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- processar ação do NUI
end
-------------------------------------------------------------------------
-- ABRIR INTERFACE
-------------------------------------------------------------------------
function src.Abrir(source)
    CLN.AbrirInterface(source, { mensagem = "Olá!" })
end
```

### html/index.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app" style="display:none;">
        <div class="container">
            <div class="header">
                <h2>Título</h2>
                <button id="btn-fechar">✕</button>
            </div>
            <div class="content">
                <!-- Conteúdo -->
            </div>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

### html/style.css

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

#app {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.container {
    background: rgba(20, 20, 30, 0.95);
    border-radius: 12px;
    padding: 24px;
    min-width: 400px;
    color: #fff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header h2 {
    font-size: 18px;
    font-weight: 600;
}

.header button {
    background: none;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    transition: color 0.2s;
}

.header button:hover {
    color: #fff;
}

.content {
    max-height: 400px;
    overflow-y: auto;
}
```

### html/script.js

```javascript
const app = document.getElementById("app");
const resourceName = window.GetParentResourceName ? GetParentResourceName() : "meu_resource";

window.addEventListener("message", function(event) {
    const data = event.data;

    switch (data.action) {
        case "open":
            app.style.display = "flex";
            // Processar data.data
            break;
        case "close":
            app.style.display = "none";
            break;
    }
});

document.getElementById("btn-fechar").addEventListener("click", fechar);

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") fechar();
});

function fechar() {
    app.style.display = "none";
    post("fechar", {});
}

function post(event, data) {
    return fetch(`https://${resourceName}/${event}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data || {}),
    });
}
```

---

## Template 4: Resource com Config Separada

### Estrutura

```
meu-resource/
├── fxmanifest.lua
├── config/
│   └── config.lua
├── client/
│   └── main.lua
└── server/
    └── main.lua
```

### fxmanifest.lua

```lua
fx_version "cerulean"
game "gta5"
lua54 "yes"

shared_scripts {
    "@vrp/lib/Utils.lua",
    "config/*.lua",
}

client_scripts {
    "client/*.lua",
}

server_scripts {
    "server/*.lua",
}
```

### config/config.lua

```lua
Config = {}

Config.Debug = false
Config.CooldownMs = 5000

Config.Locais = {
    { coords = vector3(-1038.0, -2739.0, 20.0), label = "Loja 1", blip = 52 },
    { coords = vector3(-706.0, -914.0, 19.0),   label = "Loja 2", blip = 52 },
}

Config.Precos = {
    ["water"]       = 50,
    ["barracereal"] = 100,
}
```
