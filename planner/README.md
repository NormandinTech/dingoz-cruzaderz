# Z Wayfinder (work in progress)

Route planning for any DayZ map. Server owners bring their own map image; nothing here ships Bohemia or mod-author map art.

- `index.html`: player page. Pick a map, tap start and destination, get a road route with turn directions.
- `editor.html`: owner map setup. Upload a map image, click a road colour, trace roads, fix them, add place names, test routes, save a map file.
- `tracer.js`: turns a map image into a road graph (colour mask, clutter filter, thinning, gap joining). Runs in a Web Worker via `trace-worker.js`, or in Node.
- `router.js`: shared routing engine (road graph, off-road legs, turn-by-turn directions).
- `maps/`: map list for the player page. `maps/takistan/` is a test fixture copied from the DingoZ live map; its image source is unlicensed, so don't ship it publicly.

Next: publishing (player links per server), then the $2/month live position layer.
