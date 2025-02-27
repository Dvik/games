// Import necessary modules
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { createMap } from './map.js';
import { Weapon } from './weapon.js';

// Game state
const state = {
    playing: false,
    health: 100,
    ammo: 30,
    score: 0,
    enemies: [],
    bullets: []
};

// Three.js setup
let scene, camera, renderer, controls;
let player, weapon;
let clock = new THREE.Clock();

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hudElement = document.getElementById('hud');
const healthValue = document.getElementById('health-value');
const ammoCount = document.getElementById('ammo-count');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Set camera at eye level (1.6 meters)

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Create controls (first-person controls)
    controls = new THREE.PointerLockControls(camera, renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create the map
    createMap(scene);

    // Create player
    player = new Player(camera, controls, scene);

    // Create weapon
    weapon = new Weapon(camera, scene);

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);

    // Setup UI event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);

    // Start animation loop
    animate();
}

// Function to start the game
function startGame() {
    startScreen.classList.add('hidden');
    hudElement.style.display = 'block';
    state.playing = true;
    state.health = 100;
    state.ammo = 30;
    state.score = 0;

    // Reset player position
    camera.position.set(0, 1.6, 0);

    // Clear any existing enemies
    state.enemies.forEach(enemy => scene.remove(enemy.mesh));
    state.enemies = [];

    // Spawn initial enemies
    spawnEnemies(5);

    // Lock pointer for first-person controls
    controls.lock();
}

// Function to restart the game after game over
function restartGame() {
    gameOverScreen.classList.add('hidden');
    startGame();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle key down events
function onKeyDown(event) {
    if (!state.playing) return;

    switch (event.code) {
        case 'KeyW':
            player.moveForward = true;
            break;
        case 'KeyS':
            player.moveBackward = true;
            break;
        case 'KeyA':
            player.moveLeft = true;
            break;
        case 'KeyD':
            player.moveRight = true;
            break;
        case 'Space':
            player.jump();
            break;
        case 'KeyR':
            reload();
            break;
    }
}

// Handle key up events
function onKeyUp(event) {
    if (!state.playing) return;

    switch (event.code) {
        case 'KeyW':
            player.moveForward = false;
            break;
        case 'KeyS':
            player.moveBackward = false;
            break;
        case 'KeyA':
            player.moveLeft = false;
            break;
        case 'KeyD':
            player.moveRight = false;
            break;
    }
}

// Handle mouse down events (shooting)
function onMouseDown(event) {
    if (!state.playing || event.button !== 0) return;

    if (state.ammo > 0) {
        weapon.shoot();
        state.ammo--;
        updateHUD();

        // Check for enemy hits
        checkEnemyHits();
    } else {
        // Click sound when out of ammo
        console.log("Out of ammo");
    }
}

// Function to reload the weapon
function reload() {
    if (state.ammo < 30) {
        state.ammo = 30;
        updateHUD();
        console.log("Reloaded");
    }
}

// Spawn enemies at random positions
function spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
        // Find a position that doesn't collide with existing enemies
        let validPosition = false;
        let x, z;
        let attempts = 0;
        const maxAttempts = 10;

        while (!validPosition && attempts < maxAttempts) {
            x = (Math.random() - 0.5) * 40;
            z = (Math.random() - 0.5) * 40;

            // Check if this position is far enough from other enemies
            validPosition = true;
            for (const enemy of state.enemies) {
                const dist = Math.sqrt(
                    Math.pow(x - enemy.mesh.position.x, 2) +
                    Math.pow(z - enemy.mesh.position.z, 2)
                );

                if (dist < 3) { // Minimum distance between enemies
                    validPosition = false;
                    break;
                }
            }

            attempts++;
        }

        // If we couldn't find a valid position after max attempts, just use the last one
        const enemy = new Enemy(new THREE.Vector3(x, 0, z), scene);
        state.enemies.push(enemy);
    }
}

// Check if player's shot hit any enemies
function checkEnemyHits() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const enemyMeshes = state.enemies.map(enemy => enemy.mesh);
    const intersects = raycaster.intersectObjects(enemyMeshes);

    if (intersects.length > 0) {
        const hitEnemy = state.enemies.find(enemy => enemy.mesh === intersects[0].object);
        if (hitEnemy) {
            // Remove enemy from scene
            scene.remove(hitEnemy.mesh);

            // Remove enemy from array
            const index = state.enemies.indexOf(hitEnemy);
            state.enemies.splice(index, 1);

            // Increase score
            state.score += 10;

            // Spawn new enemy after a short delay
            setTimeout(() => {
                spawnEnemies(1);
            }, 2000);
        }
    }
}

// Take damage from enemy
function takeDamage(amount) {
    state.health -= amount;
    updateHUD();

    if (state.health <= 0) {
        gameOver();
    }
}

// Game over
function gameOver() {
    state.playing = false;
    controls.unlock();
    gameOverScreen.classList.remove('hidden');
}

// Update the HUD
function updateHUD() {
    healthValue.style.width = `${state.health}%`;
    ammoCount.textContent = state.ammo;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (state.playing) {
        const delta = clock.getDelta();

        // Update player
        player.update(delta);

        // Update enemies
        state.enemies.forEach(enemy => {
            // Pass the array of all enemies to the update method
            enemy.update(delta, camera.position, state.enemies);

            // Check if enemy is close to player
            if (enemy.mesh.position.distanceTo(camera.position) < 1.5) {
                takeDamage(10);

                // Push the enemy back
                const direction = new THREE.Vector3()
                    .subVectors(enemy.mesh.position, camera.position)
                    .normalize()
                    .multiplyScalar(3);

                enemy.mesh.position.add(direction);
            }
        });
    }

    renderer.render(scene, camera);
}

// Start the game on page load
window.addEventListener('load', init);

// Controls instruction when pointer lock is released
controls.addEventListener('unlock', function () {
    if (state.playing) {
        document.getElementById('hud').innerHTML += '<div class="controls-message">Click to resume game</div>';
    }
});

controls.addEventListener('lock', function () {
    const messages = document.getElementsByClassName('controls-message');
    for (let i = 0; i < messages.length; i++) {
        messages[i].remove();
    }
}); 