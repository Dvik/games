# FPS Game

A browser-based first-person shooter game similar to Call of Duty, built with Three.js.

## Features

- First-person camera with mouse look controls
- WASD movement, mouse to aim, click to shoot
- Simple enemy AI that follows and attacks the player
- Single map with obstacles and structures
- Health, ammo, and basic UI

## How to Run

You can run this game using a local web server. Here are a few options:

### Option 1: Using Python (Simplest)

If you have Python installed:

1. Open a terminal/command prompt
2. Navigate to the game folder
3. Python 3: Run `python -m http.server`
   Python 2: Run `python -m SimpleHTTPServer`
4. Open a browser and go to `http://localhost:8000`

### Option 2: Using Node.js

If you have Node.js installed:

1. Install a simple http server: `npm install -g http-server`
2. Navigate to the game folder
3. Run `http-server`
4. Open a browser and go to `http://localhost:8080`

### Option 3: Using Live Server in VSCode

If you use Visual Studio Code:

1. Install the "Live Server" extension
2. Right-click on `index.html` and select "Open with Live Server"

## Controls

- W, A, S, D: Move
- Mouse: Look around
- Left Mouse Button: Shoot
- R: Reload
- Space: Jump
- ESC: Pause/Resume

## Game Mechanics

- Enemies will chase you when they detect you
- If enemies get too close, they will damage you
- Shoot enemies to eliminate them
- Your health is shown in the bottom left
- Your ammo count is shown in the bottom right
- The game ends when your health reaches zero

## Technical Details

This game is built with:

- HTML5, CSS, and JavaScript
- Three.js for 3D rendering
- Custom collision detection and physics

## Future Improvements

Here are some ideas to expand the game:

- Add more weapon types
- Implement power-ups
- Add sound effects and music
- Create additional maps
- Improve enemy AI
- Add multiplayer capability 