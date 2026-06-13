# Script Modules

`core.js`
- Global constants, shared `state`, DOM helper, app bootstrap wiring, mode switching.

`render.js`
- PIXI layout sizing, background, lane frame, keycap drawing, key glow visuals.

`charting.js`
- MIDI file loading, sampler scheduling, automatic chart generation, track analysis, note normalization utilities.

`sources.js`
- Autoplay toggle UI, imported chart conversion, built-in demo source loading.

`gameplay.js`
- Session start/restart flow, main tick loop, note rendering, input, judgement, combo/fever, hit FX.

`editor-ui.js`
- In-game chart editor, chart export/copy flow, chart panel, HUD updates, result screen helpers.

`boot.js`
- Calls `init()` after every feature module has loaded.

## Change guide

- New scoring, judge, combo, fever logic: edit `gameplay.js`
- New MIDI parsing or auto-chart rules: edit `charting.js`
- New HUD or result UI behavior: edit `editor-ui.js`
- New visual lane/background treatment: edit `render.js`
- New demo/import source handling: edit `sources.js`
