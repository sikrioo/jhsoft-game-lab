# Outbreak Block

A self-contained zombie crowd sandbox built from the sprite sheets in:

`assets/craftpix-net-503404-free-urban-zombie-sprite-sheet-pixel-art-pack`

The Phaser runtime is bundled locally in `vendor/phaser.min.js`, so the project does not depend on a CDN at launch.

## Features

- Uses all four provided zombie variants.
- Includes `idle`, `walk`, `attack`, `hurt`, and `dead` animation states.
- Runs on a procedurally dressed urban quarantine block made with Phaser.
- Zombies roam on their own, separate from each other, avoid obstacles, and react to a noise beacon.
- Right-click shockwaves trigger the hurt and dead sheets so the full asset pack is visible in play.

## Run

Because the project uses ES modules and image loading, run it from a local server.

Windows:

```bat
run_local_server.bat
```

Then open:

```text
http://localhost:8080
```

## Controls

- `Left Click`: place or move the noise beacon
- `Right Click`: fire a shockwave
- `WASD` or arrow keys: move the camera
- `Mouse Wheel` or `Q / E`: zoom
- `R`: clear the beacon
- `Space`: pause or resume the crowd director
- `F`: snap the camera back to the horde focus
