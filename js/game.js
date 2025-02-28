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
    bullets: [],
    obstacles: [], // Array to store map obstacles
    damageCooldown: false, // Cooldown for taking damage (to prevent rapid damage)
    damageFlashTime: 0, // Time for damage flash effect
    playerDamage: 100 // Increased damage amount to kill in one shot
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
    console.log('Initializing game...');
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

    // Create the map and get obstacles
    state.obstacles = createMap(scene);

    // Create player
    player = new Player(camera, controls, scene);

    // Create weapon
    weapon = new Weapon(camera, scene);

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Setup UI event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', restartGame);

    // Enhance HUD with additional CSS
    enhanceHUD();

    // Start animation loop
    animate();

    console.log('Game initialized, ready to spawn enemies on game start');
}

// Enhance the HUD with damage flash effect and better health visualization
function enhanceHUD() {
    // Create a damage flash overlay
    const damageFlash = document.createElement('div');
    damageFlash.id = 'damage-flash';
    damageFlash.style.position = 'absolute';
    damageFlash.style.top = '0';
    damageFlash.style.left = '0';
    damageFlash.style.width = '100%';
    damageFlash.style.height = '100%';
    damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0)'; // Start transparent
    damageFlash.style.pointerEvents = 'none';
    damageFlash.style.transition = 'background-color 0.1s ease-out';
    damageFlash.style.zIndex = '5';
    hudElement.appendChild(damageFlash);

    // Add health text
    const healthText = document.createElement('div');
    healthText.id = 'health-text';
    healthText.style.position = 'absolute';
    healthText.style.left = '20px';
    healthText.style.bottom = '50px';
    healthText.style.color = 'white';
    healthText.style.fontWeight = 'bold';
    healthText.style.textShadow = '1px 1px 2px black';
    healthText.textContent = 'Health: 100';
    hudElement.appendChild(healthText);

    // Make health bar more visible
    const healthBar = document.getElementById('health-bar');
    healthBar.style.border = '2px solid white';
    healthBar.style.borderRadius = '3px';
    healthBar.style.overflow = 'hidden';

    const healthValueBar = document.getElementById('health-value');
    healthValueBar.style.transition = 'width 0.3s ease-out';
    healthValueBar.style.background = 'linear-gradient(to right, #ff0000, #ff3300)';
    healthValueBar.style.height = '100%';
    healthValueBar.style.width = '100%';
}

// Start the game
function startGame() {
    // Reset game state
    state.playing = true;
    state.health = 100;
    state.ammo = 30;
    state.score = 0;
    state.damageCooldown = false;
    state.damageFlashTime = 0;

    // Hide start screen and show HUD
    startScreen.classList.add('hidden');
    hudElement.style.display = 'block';

    // Lock pointer and enable controls
    controls.lock();

    // Clear any existing enemies
    state.enemies.forEach(enemy => {
        scene.remove(enemy.mesh);
    });
    state.enemies = [];

    // Spawn initial enemies
    spawnEnemies(5);
}

// Handle pointer lock change event
function onPointerLockChange() {
    if (document.pointerLockElement === renderer.domElement) {
        // Pointer is locked, game is active
        state.playing = true;
    } else if (state.playing) {
        // Pointer is unlocked but game was active, show pause message
        const pauseMessage = document.createElement('div');
        pauseMessage.className = 'controls-message';
        pauseMessage.style.position = 'absolute';
        pauseMessage.style.top = '50%';
        pauseMessage.style.left = '50%';
        pauseMessage.style.transform = 'translate(-50%, -50%)';
        pauseMessage.style.color = 'white';
        pauseMessage.style.fontSize = '24px';
        pauseMessage.style.fontWeight = 'bold';
        pauseMessage.style.textAlign = 'center';
        pauseMessage.style.textShadow = '2px 2px 4px black';
        pauseMessage.textContent = 'Game Paused\nClick to resume';
        hudElement.appendChild(pauseMessage);
    }
}

// Restart the game
function restartGame() {
    state.health = 100;
    state.ammo = 30;
    state.score = 0;
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
        // Visual feedback when out of ammo
        showReloadMessage();
        // Make ammo count flash red
        flashAmmoCount();
    }
}

// Function to reload the weapon
function reload() {
    if (state.ammo < 30) {
        state.ammo = 30;
        updateHUD();

        // Remove the reload message if it exists
        const reloadMsg = document.getElementById('reload-message');
        if (reloadMsg) {
            reloadMsg.remove();
        }

        // Show reload confirmation
        showReloadConfirmation();
    }
}

// Show a message prompting player to reload
function showReloadMessage() {
    // Don't show multiple messages
    if (document.getElementById('reload-message')) return;

    const reloadMessage = document.createElement('div');
    reloadMessage.id = 'reload-message';
    reloadMessage.style.position = 'absolute';
    reloadMessage.style.bottom = '120px';
    reloadMessage.style.right = '20px';
    reloadMessage.style.color = '#ff3300';
    reloadMessage.style.fontWeight = 'bold';
    reloadMessage.style.fontSize = '24px';
    reloadMessage.style.textShadow = '2px 2px 4px black';
    reloadMessage.style.padding = '10px';
    reloadMessage.style.borderRadius = '5px';
    reloadMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    reloadMessage.style.animation = 'pulse 1s infinite';
    reloadMessage.textContent = 'OUT OF AMMO - Press R to Reload';
    hudElement.appendChild(reloadMessage);

    // Add the pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Make the ammo count flash red when empty
function flashAmmoCount() {
    const ammoElement = document.getElementById('ammo-count');
    ammoElement.style.color = '#ff0000';
    ammoElement.style.animation = 'ammo-flash 0.5s infinite';

    // Add the flash animation if not already added
    if (!document.getElementById('ammo-flash-style')) {
        const style = document.createElement('style');
        style.id = 'ammo-flash-style';
        style.textContent = `
            @keyframes ammo-flash {
                0% { color: #ff0000; }
                50% { color: #ffffff; }
                100% { color: #ff0000; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Show a brief reload confirmation message
function showReloadConfirmation() {
    const reloadConfirm = document.createElement('div');
    reloadConfirm.style.position = 'absolute';
    reloadConfirm.style.bottom = '120px';
    reloadConfirm.style.right = '20px';
    reloadConfirm.style.color = '#33cc33';
    reloadConfirm.style.fontWeight = 'bold';
    reloadConfirm.style.fontSize = '24px';
    reloadConfirm.style.textShadow = '2px 2px 4px black';
    reloadConfirm.style.padding = '10px';
    reloadConfirm.style.borderRadius = '5px';
    reloadConfirm.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    reloadConfirm.style.opacity = '1';
    reloadConfirm.style.transition = 'opacity 0.5s ease-out';
    reloadConfirm.textContent = 'RELOADED';
    hudElement.appendChild(reloadConfirm);

    // Reset the ammo count color and animation
    const ammoElement = document.getElementById('ammo-count');
    ammoElement.style.color = '';
    ammoElement.style.animation = '';

    // Fade out and remove the message
    setTimeout(() => {
        reloadConfirm.style.opacity = '0';
        setTimeout(() => {
            if (reloadConfirm.parentNode) {
                reloadConfirm.parentNode.removeChild(reloadConfirm);
            }
        }, 500);
    }, 1000);
}

// Spawn enemies at random positions
function spawnEnemies(count) {
    console.log(`Attempting to spawn ${count} enemies`);

    for (let i = 0; i < count; i++) {
        // Find a position that doesn't collide with existing enemies or obstacles
        let validPosition = false;
        let x, z;
        let attempts = 0;
        const maxAttempts = 30; // Increased from 20 to allow more attempts

        // Define map boundaries (adjust these values based on your map size)
        const mapBoundary = 30; // Restrict spawning to within ±30 units from center

        while (!validPosition && attempts < maxAttempts) {
            // Spawn within a more limited range to avoid going outside the map
            x = (Math.random() - 0.5) * (mapBoundary * 1.5);
            z = (Math.random() - 0.5) * (mapBoundary * 1.5);

            // Create a temporary box for collision testing
            const testBox = new THREE.Box3();
            testBox.setFromCenterAndSize(
                new THREE.Vector3(x, 1, z),
                new THREE.Vector3(1, 2, 1) // Enemy size
            );

            // Check if this position is within map boundaries
            if (Math.abs(x) > mapBoundary || Math.abs(z) > mapBoundary) {
                attempts++;
                continue; // Position is outside map, try again
            }

            // Check if position is valid
            validPosition = true;

            // Check collision with other enemies
            for (const enemy of state.enemies) {
                const dist = Math.sqrt(
                    Math.pow(x - enemy.mesh.position.x, 2) +
                    Math.pow(z - enemy.mesh.position.z, 2)
                );

                if (dist < 4) { // Increased minimum distance (was 3)
                    validPosition = false;
                    break;
                }
            }

            // Check collision with obstacles
            if (validPosition) {
                for (const obstacle of state.obstacles) {
                    if (!obstacle.mesh) continue;

                    const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);

                    // Add a buffer around obstacles to prevent spawning too close
                    obstacleBox.expandByScalar(1);

                    if (testBox.intersectsBox(obstacleBox)) {
                        validPosition = false;
                        break;
                    }
                }
            }

            // Check distance from player to avoid spawning too close
            const distanceToPlayer = Math.sqrt(
                Math.pow(x - camera.position.x, 2) +
                Math.pow(z - camera.position.z, 2)
            );

            if (distanceToPlayer < 10) { // Don't spawn too close to player
                validPosition = false;
            }

            attempts++;
        }

        // If we couldn't find a valid position after max attempts, use a fallback position
        if (!validPosition) {
            console.log(`Could not find valid position after ${attempts} attempts, using fallback position`);
            // Use a safe fallback position - randomly select one of several predefined spawn points
            const spawnPoints = [
                { x: 15, z: 15 },
                { x: -15, z: 15 },
                { x: 15, z: -15 },
                { x: -15, z: -15 },
                { x: 0, z: 20 },
                { x: 20, z: 0 },
                { x: -20, z: 0 },
                { x: 0, z: -20 }
            ];

            // Select a random spawn point
            const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
            x = spawnPoint.x;
            z = spawnPoint.z;

            // Check if this spawn point collides with anything
            let collides = false;

            // Create a test box for the fallback position
            const testBox = new THREE.Box3();
            testBox.setFromCenterAndSize(
                new THREE.Vector3(x, 1, z),
                new THREE.Vector3(1, 2, 1)
            );

            // Check for collisions with obstacles
            for (const obstacle of state.obstacles) {
                if (!obstacle.mesh) continue;

                const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);
                if (testBox.intersectsBox(obstacleBox)) {
                    collides = true;
                    break;
                }
            }

            // If the fallback position also collides, move it up slightly
            if (collides) {
                x += (Math.random() - 0.5) * 5;
                z += (Math.random() - 0.5) * 5;
            }
        }

        // Create enemy at valid position
        try {
            console.log(`Creating enemy at position x:${x}, z:${z}`);
            const enemy = new Enemy(new THREE.Vector3(x, 0, z), scene);
            state.enemies.push(enemy);
            console.log(`Enemy created successfully, total enemies: ${state.enemies.length}`);
        } catch (error) {
            console.error('Error creating enemy:', error);
        }
    }
}

// Check if player's shot hit any enemies
function checkEnemyHits() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // First check for obstacle hits (so bullets don't go through walls)
    const obstacleObjects = state.obstacles.map(obstacle => obstacle.mesh);
    const obstacleIntersects = raycaster.intersectObjects(obstacleObjects);

    if (obstacleIntersects.length > 0) {
        // If hit an obstacle first, create impact effect but don't check for enemy hits
        weapon.createBulletImpact(obstacleIntersects[0].point);
        return;
    }

    // Check for enemy hits
    const enemyMeshes = state.enemies.map(enemy => enemy.mesh);
    console.log(`Checking for enemy hits. Current enemies: ${state.enemies.length}`);
    const enemyIntersects = raycaster.intersectObjects(enemyMeshes);

    if (enemyIntersects.length > 0) {
        const hitEnemy = state.enemies.find(enemy => enemy.mesh === enemyIntersects[0].object);
        if (hitEnemy) {
            console.log('Enemy hit!');
            // Apply damage to enemy - return value is true if enemy is killed
            const isKilled = hitEnemy.takeDamage(state.playerDamage);

            // Create impact effect at hit point
            weapon.createBulletImpact(enemyIntersects[0].point);

            // Only remove enemy if it's killed
            if (isKilled) {
                console.log('Enemy killed!');
                // Calculate distance between player and enemy
                const playerPosition = camera.position.clone();
                const enemyPosition = hitEnemy.mesh.position.clone();
                const distance = playerPosition.distanceTo(enemyPosition);

                // Calculate score based on distance
                // Base score: 10 points
                // Distance bonus: More points for greater distances
                let scoreValue = 10;

                if (distance > 10) {
                    // Additional points for distance (max 40 points at 25+ meters)
                    const distanceBonus = Math.min(40, Math.ceil(distance * 1.6));
                    scoreValue += distanceBonus;

                    // Show distance and bonus score message
                    showDistanceKillMessage(Math.floor(distance), distanceBonus);
                } else {
                    // Just show regular kill message for close kills
                    showKillMessage(scoreValue);
                }

                // Add to total score
                state.score += scoreValue;
                console.log(`Score updated: ${state.score}`);

                // Update score display
                updateHUD();

                // Remove enemy from scene
                scene.remove(hitEnemy.mesh);

                // Remove enemy from array
                const index = state.enemies.indexOf(hitEnemy);
                state.enemies.splice(index, 1);
                console.log(`Enemy removed. Remaining enemies: ${state.enemies.length}`);

                // Spawn new enemy after a short delay
                console.log('Scheduling new enemy spawn in 2 seconds');
                setTimeout(() => {
                    spawnEnemies(1);
                }, 2000);
            }
        }
    }
}

// Show kill message
function showKillMessage(points) {
    // Create and show a temporary "Enemy Killed" message
    const killMessage = document.createElement('div');
    killMessage.style.position = 'absolute';
    killMessage.style.top = '30%';
    killMessage.style.left = '50%';
    killMessage.style.transform = 'translate(-50%, -50%)';
    killMessage.style.display = 'flex';
    killMessage.style.flexDirection = 'column';
    killMessage.style.alignItems = 'center';
    killMessage.style.opacity = '1';
    killMessage.style.transition = 'opacity 0.5s ease-out';

    // Message text
    const messageText = document.createElement('div');
    messageText.style.color = 'red';
    messageText.style.fontWeight = 'bold';
    messageText.style.fontSize = '24px';
    messageText.style.textShadow = '2px 2px 4px black';
    messageText.textContent = 'Enemy Killed!';
    killMessage.appendChild(messageText);

    // Points text
    const pointsText = document.createElement('div');
    pointsText.style.color = '#00ffcc';
    pointsText.style.fontWeight = 'bold';
    pointsText.style.fontSize = '18px';
    pointsText.style.textShadow = '1px 1px 3px black';
    pointsText.textContent = `+${points} points!`;
    killMessage.appendChild(pointsText);

    hudElement.appendChild(killMessage);

    // Fade out and remove the message
    setTimeout(() => {
        killMessage.style.opacity = '0';
        setTimeout(() => {
            if (killMessage.parentNode) {
                killMessage.parentNode.removeChild(killMessage);
            }
        }, 500);
    }, 1000);
}

// Show distance kill message with bonus
function showDistanceKillMessage(distance, bonus) {
    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.style.position = 'absolute';
    messageContainer.style.top = '30%';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translate(-50%, -50%)';
    messageContainer.style.display = 'flex';
    messageContainer.style.flexDirection = 'column';
    messageContainer.style.alignItems = 'center';
    messageContainer.style.opacity = '1';
    messageContainer.style.transition = 'opacity 0.5s ease-out';
    hudElement.appendChild(messageContainer);

    // Create kill message
    const killMessage = document.createElement('div');
    killMessage.style.color = 'red';
    killMessage.style.fontWeight = 'bold';
    killMessage.style.fontSize = '24px';
    killMessage.style.textShadow = '2px 2px 4px black';
    killMessage.textContent = 'Enemy Killed!';
    messageContainer.appendChild(killMessage);

    // Create distance message
    const distanceMessage = document.createElement('div');
    distanceMessage.style.color = '#ffcc00';
    distanceMessage.style.fontWeight = 'bold';
    distanceMessage.style.fontSize = '20px';
    distanceMessage.style.textShadow = '1px 1px 3px black';
    distanceMessage.textContent = `Long Shot: ${distance}m`;
    messageContainer.appendChild(distanceMessage);

    // Create bonus message
    const bonusMessage = document.createElement('div');
    bonusMessage.style.color = '#00ffcc';
    bonusMessage.style.fontWeight = 'bold';
    bonusMessage.style.fontSize = '18px';
    bonusMessage.style.textShadow = '1px 1px 3px black';
    bonusMessage.textContent = `+${bonus} points!`;
    messageContainer.appendChild(bonusMessage);

    // Fade out and remove the message
    setTimeout(() => {
        messageContainer.style.opacity = '0';
        setTimeout(() => {
            if (messageContainer.parentNode) {
                messageContainer.parentNode.removeChild(messageContainer);
            }
        }, 500);
    }, 1500);
}

// Take damage from enemy
function takeDamage(amount) {
    // Don't take damage if in cooldown
    if (state.damageCooldown) return;

    // Apply damage
    state.health -= amount;

    // Show damage flash effect
    showDamageFlash();

    // Update the HUD
    updateHUD();

    // Set cooldown to prevent rapid damage
    state.damageCooldown = true;
    setTimeout(() => {
        state.damageCooldown = false;
    }, 300); // 300ms cooldown

    // Check for game over
    if (state.health <= 0) {
        gameOver();
    }
}

// Show damage flash effect
function showDamageFlash() {
    const damageFlash = document.getElementById('damage-flash');
    damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';

    setTimeout(() => {
        damageFlash.style.backgroundColor = 'rgba(255, 0, 0, 0)';
    }, 100);
}

// Game over
function gameOver() {
    state.playing = false;
    controls.unlock();
    gameOverScreen.classList.remove('hidden');
}

// Update the HUD
function updateHUD() {
    // Update health bar
    const healthValueBar = document.getElementById('health-value');
    healthValueBar.style.width = `${Math.max(0, state.health)}%`;

    // Update health text
    const healthText = document.getElementById('health-text');
    if (healthText) {
        healthText.textContent = `Health: ${Math.max(0, state.health)}`;
    }

    // Update ammo count
    ammoCount.textContent = state.ammo;

    // Update score display
    const scoreValue = document.getElementById('score-value');
    if (scoreValue) {
        scoreValue.textContent = state.score;
    }

    // If ammo is low, change color to yellow
    if (state.ammo <= 5 && state.ammo > 0) {
        ammoCount.style.color = '#ffcc00';
    } else if (state.ammo <= 0) {
        ammoCount.style.color = '#ff0000';
    } else {
        ammoCount.style.color = '';
    }

    // Update health bar color based on health level
    if (state.health < 30) {
        healthValueBar.style.background = 'linear-gradient(to right, #ff0000, #ff3300)';
    } else if (state.health < 60) {
        healthValueBar.style.background = 'linear-gradient(to right, #ff3300, #ffcc00)';
    } else {
        healthValueBar.style.background = 'linear-gradient(to right, #66cc00, #33cc33)';
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (state.playing) {
        const delta = clock.getDelta();

        // Update player
        player.update(delta);

        // Store player's previous position for collisions
        const previousPlayerPos = camera.position.clone();

        // Update player based on user input
        if (player.moveForward || player.moveBackward || player.moveLeft || player.moveRight) {
            // Check for collisions with obstacles after player movement
            const playerBox = new THREE.Box3();
            playerBox.setFromCenterAndSize(
                camera.position,
                new THREE.Vector3(0.5, 1.6, 0.5) // Player size
            );

            // Check collision with obstacles
            let obstacleCollision = false;
            for (const obstacle of state.obstacles) {
                if (!obstacle.mesh) continue;

                const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);

                if (playerBox.intersectsBox(obstacleBox)) {
                    obstacleCollision = true;
                    break;
                }
            }

            // If collision detected, revert to previous position
            if (obstacleCollision) {
                camera.position.copy(previousPlayerPos);
            }
        }

        // Update enemies
        state.enemies.forEach(enemy => {
            // Pass the array of all enemies and obstacles to the update method
            enemy.update(delta, camera.position, state.enemies, state.obstacles);

            // Check if enemy is close to player (melee damage)
            if (enemy.mesh.position.distanceTo(camera.position) < 1.5) {
                takeDamage(10);

                // Push the enemy back
                const direction = new THREE.Vector3()
                    .subVectors(enemy.mesh.position, camera.position)
                    .normalize()
                    .multiplyScalar(3);

                enemy.mesh.position.add(direction);
            }

            // Handle enemy shooting at player
            if (enemy.canShoot && enemy.tryShootAtPlayer(camera.position, state.obstacles)) {
                // If the enemy successfully shot at the player, apply damage
                const damage = enemy.shoot(camera.position);
                if (damage > 0) {
                    takeDamage(damage);
                }
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