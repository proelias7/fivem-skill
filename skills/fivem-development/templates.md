# Resource Templates — vRP

## Template 1: Basic Resource (Server Only)

### Structure

```
my-resource/
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

-- Your code here
```

---

## Template 2: Client + Server Resource

### Structure

```
my-resource/
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

Proxy.addInterface("my_resource", src)
Tunnel.bindInterface("my_resource", cln)
-------------------------------------------------------------------------
-- FUNCTIONS
-------------------------------------------------------------------------

-- Server-side functions that client can call via Tunnel
function cln.MyFunction()
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- logic
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
SRC = Tunnel.getInterface("my_resource")

local cln = {}
Tunnel.bindInterface("my_resource", cln)
-------------------------------------------------------------------------
-- FUNCTIONS
-------------------------------------------------------------------------

-- Client-side functions that server can call via Tunnel
function cln.MyClientFunction()
    -- client logic
end
```

---

## Template 3: Resource with NUI

### Structure

```
my-resource/
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
SRC = Tunnel.getInterface("my_resource")

local cln = {}
Tunnel.bindInterface("my_resource", cln)
-------------------------------------------------------------------------
-- NUI
-------------------------------------------------------------------------
local isOpen = false

function OpenNUI(data)
    if not isOpen then
        isOpen = true
        SetNuiFocus(true, true)
        SendNUIMessage({ action = "open", data = data })
    end
end

function CloseNUI()
    if isOpen then
        isOpen = false
        SetNuiFocus(false, false)
        SendNUIMessage({ action = "close" })
    end
end

RegisterNUICallback("close", function(data, cb)
    CloseNUI()
    cb("ok")
end)

RegisterNUICallback("action", function(data, cb)
    SRC.ProcessAction(data)
    cb("ok")
end)
-------------------------------------------------------------------------
-- CLIENT TUNNEL
-------------------------------------------------------------------------
function cln.OpenInterface(data)
    OpenNUI(data)
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
CLN = Tunnel.getInterface("my_resource")

local src = {}
local cln = {}

Proxy.addInterface("my_resource", src)
Tunnel.bindInterface("my_resource", cln)
-------------------------------------------------------------------------
-- TUNNEL FUNCTIONS
-------------------------------------------------------------------------
function cln.ProcessAction(data)
    local source = source
    local Passport = vRP.Passport(source)
    if not Passport then return end
    -- process NUI action
end
-------------------------------------------------------------------------
-- OPEN INTERFACE
-------------------------------------------------------------------------
function src.Open(source)
    CLN.OpenInterface(source, { message = "Hello!" })
end
```

### html/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app" style="display:none;">
        <div class="container">
            <div class="header">
                <h2>Title</h2>
                <button id="btn-close">✕</button>
            </div>
            <div class="content">
                <!-- Content -->
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
const resourceName = window.GetParentResourceName ? GetParentResourceName() : "my_resource";

window.addEventListener("message", function(event) {
    const data = event.data;

    switch (data.action) {
        case "open":
            app.style.display = "flex";
            // Process data.data
            break;
        case "close":
            app.style.display = "none";
            break;
    }
});

document.getElementById("btn-close").addEventListener("click", close);

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") close();
});

function close() {
    app.style.display = "none";
    post("close", {});
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

## Template 4: Resource with Separate Config

### Structure

```
my-resource/
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

Config.Locations = {
    { coords = vector3(-1038.0, -2739.0, 20.0), label = "Shop 1", blip = 52 },
    { coords = vector3(-706.0, -914.0, 19.0),   label = "Shop 2", blip = 52 },
}

Config.Prices = {
    ["water"]       = 50,
    ["cerealbar"]   = 100,
}
```
