export class Enemy {
    constructor(position, scene) {
        this.scene = scene;
        this.speed = 2.0;
        this.health = 100;
        this.maxHealth = 100; // Store max health for health bar calculation
        this.type = 'enemy'; // Add type identifier

        // Create enemy mesh
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Store a reference to this enemy on the mesh for collision detection
        this.mesh.userData.parent = this;
        this.mesh.userData.type = 'enemy';

        // Create health bar
        this.createHealthBar();

        // Add mesh to scene
        scene.add(this.mesh);

        // Movement properties
        this.moveDirection = new THREE.Vector3();
        this.tempVector = new THREE.Vector3();
        this.previousPosition = new THREE.Vector3();

        // Path finding variables
        this.pathUpdateTime = 0;
        this.pathUpdateInterval = 0.2; // Update path more frequently (was 0.5)

        // Improved pathfinding properties
        this.isStuck = false;
        this.stuckTime = 0;
        this.stuckThreshold = 0.5; // Reduced time to consider stuck (was 1.0)
        this.lastPositions = []; // Store last few positions to detect being stuck
        this.pathfindingMode = 'direct'; // 'direct', 'around', 'hunting'
        this.pathSwitchTime = 0;
        this.currentPathDirection = null; // For tracking alternate path direction
        this.huntingTimeout = 0; // Time spent actively hunting the player
        this.lastKnownPlayerPosition = null; // Store player's last known position
        this.memory = 10; // How long (in seconds) the enemy remembers player's last position
        this.memoryTimer = 0; // Timer for forgetting player's position

        // Random movement within range of player
        this.wanderRadius = 15;
        this.detectionRadius = 40; // Increased detection radius (was 30)
        this.attackRadius = 15; // Increased attack radius (was 10)

        // Collision avoidance
        this.avoidanceRadius = 2.5; // Distance to start avoiding other enemies

        // Shooting properties
        this.canShoot = true;
        this.shootCooldown = 2.0; // Time between shots in seconds
        this.shootTimer = 0;
        this.shootRange = 20; // Maximum shooting range (was 15)
        this.shootDamage = 5; // Damage per shot
        this.shootAccuracy = 0.7; // Probability of hitting player (0-1)

        // Create the muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, -0.6); // Position in front of enemy
        this.mesh.add(this.muzzleFlash);
        this.muzzleFlash.visible = false;

        // Debug visualization for pathfinding (if enabled)
        this.debugMode = false;
        this.debugMarkers = [];
    }

    createHealthBar() {
        // Create a container for the health bar that will always face the camera
        this.healthBarContainer = new THREE.Object3D();
        this.healthBarContainer.position.set(0, 2.2, 0); // Position above enemy
        this.mesh.add(this.healthBarContainer);

        // Create health bar background (black)
        const backgroundGeometry = new THREE.PlaneGeometry(1.2, 0.2);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            depthTest: false
        });
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.healthBarContainer.add(this.healthBarBackground);

        // Create health bar foreground (green/red gradient)
        const foregroundGeometry = new THREE.PlaneGeometry(1.2, 0.2);
        const foregroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            depthTest: false
        });
        this.healthBarForeground = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
        this.healthBarForeground.scale.set(1, 1, 1); // Will be scaled based on health
        this.healthBarForeground.position.set(0, 0, 0.01); // Slightly in front of background
        this.healthBarContainer.add(this.healthBarForeground);
    }

    update(delta, playerPosition, otherEnemies, obstacles) {
        // Make health bar face camera
        if (this.healthBarContainer) {
            this.healthBarContainer.lookAt(playerPosition);
        }

        // Store previous position for collision resolution and stuck detection
        this.previousPosition.copy(this.mesh.position);

        // Track positions to detect if stuck
        this.trackPosition();

        // Update memory of player's position
        if (this.hasLineOfSightToPlayer(playerPosition, obstacles)) {
            // If we can see the player, update last known position
            this.lastKnownPlayerPosition = playerPosition.clone();
            this.memoryTimer = 0;
        } else if (this.lastKnownPlayerPosition) {
            // Increment memory timer if we have a stored position
            this.memoryTimer += delta;
            if (this.memoryTimer > this.memory) {
                // Forget player's position after memory time expires
                this.lastKnownPlayerPosition = null;
            }
        }

        // Path finding update
        this.pathUpdateTime += delta;
        if (this.pathUpdateTime >= this.pathUpdateInterval) {
            this.pathUpdateTime = 0;
            this.updatePath(playerPosition, otherEnemies, obstacles);
        }

        // Update stuck timer if enemy hasn't moved much
        if (this.isStuck) {
            this.stuckTime += delta;
            if (this.stuckTime > this.stuckThreshold) {
                // Switch pathfinding mode if stuck for too long
                this.switchPathfindingMode(obstacles, playerPosition);
                this.stuckTime = 0;
            }
        }

        // Move enemy based on current pathfinding mode
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const targetPosition = this.lastKnownPlayerPosition || playerPosition;

        // Only move if within detection radius but not too close
        if (distanceToPlayer < this.detectionRadius && distanceToPlayer > 1.5) {
            // Calculate move vector based on current pathfinding mode
            let moveVector = new THREE.Vector3();

            switch (this.pathfindingMode) {
                case 'direct':
                    // Direct path to player
                    moveVector.subVectors(targetPosition, this.mesh.position).normalize();
                    break;

                case 'around':
                    // Try to move around obstacles
                    moveVector = this.calculateAroundPath(obstacles, targetPosition);
                    break;

                case 'hunting':
                    // More aggressive hunting behavior
                    moveVector = this.calculateHuntingPath(targetPosition, obstacles);
                    break;

                default:
                    moveVector.subVectors(targetPosition, this.mesh.position).normalize();
            }

            // Apply enemy avoidance to the movement direction
            this.moveDirection.copy(moveVector);
            this.applyEnemyAvoidance(otherEnemies);

            // Move towards target
            const moveSpeed = this.speed * delta;
            this.tempVector.copy(this.moveDirection).multiplyScalar(moveSpeed);

            // Only move on X and Z axes (keep Y position fixed to ground)
            const newX = this.mesh.position.x + this.tempVector.x;
            const newZ = this.mesh.position.z + this.tempVector.z;

            // Try movement first on X axis, then Z axis separately to allow sliding along walls
            this.mesh.position.x = newX;

            // Check for collisions with obstacles after moving on X axis
            if (obstacles && this.checkObstacleCollisions(obstacles)) {
                // If collision on X axis, revert just the X position
                this.mesh.position.x = this.previousPosition.x;
                // Mark as potentially stuck on X
                this.isStuck = true;
            }

            // Then try movement on Z axis
            this.mesh.position.z = newZ;

            // Check for collisions with obstacles after moving on Z axis
            if (obstacles && this.checkObstacleCollisions(obstacles)) {
                // If collision on Z axis, revert just the Z position
                this.mesh.position.z = this.previousPosition.z;
                // Mark as potentially stuck on Z
                this.isStuck = true;
            }

            // If we didn't get stuck on either axis, we're not stuck
            if (this.mesh.position.x !== this.previousPosition.x ||
                this.mesh.position.z !== this.previousPosition.z) {
                this.isStuck = false;
                this.stuckTime = 0;
            }

            // Face towards player or movement direction based on mode
            if (this.pathfindingMode === 'direct' || this.hasLineOfSightToPlayer(playerPosition, obstacles)) {
                this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
            } else {
                // Look in the direction of movement
                const lookTarget = new THREE.Vector3(
                    this.mesh.position.x + this.moveDirection.x,
                    this.mesh.position.y,
                    this.mesh.position.z + this.moveDirection.z
                );
                this.mesh.lookAt(lookTarget);
            }
        }

        // Update hunting timeout
        if (this.pathfindingMode === 'hunting') {
            this.huntingTimeout += delta;
            if (this.huntingTimeout > 5) {
                // After 5 seconds, try direct approach again
                this.pathfindingMode = 'direct';
                this.huntingTimeout = 0;
            }
        }

        // Update shooting cooldown
        if (!this.canShoot) {
            this.shootTimer += delta;
            if (this.shootTimer >= this.shootCooldown) {
                this.canShoot = true;
                this.shootTimer = 0;
            }
        }

        // Try to shoot at player if in range and cooldown finished
        if (this.canShoot && distanceToPlayer < this.shootRange) {
            this.tryShootAtPlayer(playerPosition, obstacles);
        }

        // Clear old debug markers if any
        if (this.debugMode) {
            this.clearDebugMarkers();
        }
    }

    trackPosition() {
        // Store last few positions (limit to 5)
        this.lastPositions.push(this.mesh.position.clone());
        if (this.lastPositions.length > 5) {
            this.lastPositions.shift();
        }

        // If we have enough position samples, check if stuck
        if (this.lastPositions.length >= 5) {
            let totalMovement = 0;
            for (let i = 1; i < this.lastPositions.length; i++) {
                totalMovement += this.lastPositions[i].distanceTo(this.lastPositions[i - 1]);
            }

            // If total movement over last 5 frames is very small, consider stuck
            if (totalMovement < 0.1) { // Reduced threshold (was 0.2)
                this.isStuck = true;
            }
        }
    }

    switchPathfindingMode(obstacles, playerPosition) {
        // If we've been in hunting mode for too long without progress, try a completely random direction
        if (this.pathfindingMode === 'hunting' && this.huntingTimeout > 3) {
            // Random perpendicular direction
            this.moveDirection.set(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();

            return;
        }

        switch (this.pathfindingMode) {
            case 'direct':
                // If direct path is blocked, try around path
                this.pathfindingMode = 'around';

                // Choose a random perpendicular direction
                const dirToPlayer = new THREE.Vector3().subVectors(
                    playerPosition, this.mesh.position
                ).normalize();

                // Find perpendicular vector (either right or left of player direction)
                this.currentPathDirection = Math.random() > 0.5 ?
                    new THREE.Vector3(dirToPlayer.z, 0, -dirToPlayer.x) :
                    new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
                break;

            case 'around':
                // If around path doesn't work, try hunting mode with different direction
                this.pathfindingMode = 'hunting';
                this.huntingTimeout = 0;

                // Try the opposite direction
                if (this.currentPathDirection) {
                    this.currentPathDirection.negate();
                }
                break;

            case 'hunting':
                // If hunting doesn't work, try a different around path
                this.pathfindingMode = 'around';

                // Try a random direction
                const randomAngle = Math.random() * Math.PI * 2;
                this.currentPathDirection = new THREE.Vector3(
                    Math.cos(randomAngle),
                    0,
                    Math.sin(randomAngle)
                );
                break;
        }

        // Reset stuck timer
        this.stuckTime = 0;

        // Debug visualization
        if (this.debugMode) {
            console.log(`Enemy switched to ${this.pathfindingMode} mode`);
        }
    }

    calculateAroundPath(obstacles, playerPosition) {
        if (!this.currentPathDirection) {
            // Initialize path direction if not set
            const dirToPlayer = new THREE.Vector3().subVectors(
                playerPosition, this.mesh.position
            ).normalize();

            // Perpendicular vector (either right or left of player direction)
            this.currentPathDirection = Math.random() > 0.5 ?
                new THREE.Vector3(dirToPlayer.z, 0, -dirToPlayer.x) :
                new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x);
        }

        // Start with the side direction
        const aroundDirection = this.currentPathDirection.clone();

        // Blend with a bit of forward motion toward player
        const dirToPlayer = new THREE.Vector3().subVectors(
            playerPosition, this.mesh.position
        ).normalize();

        // Blend 60% side movement, 40% toward player (was 70/30)
        aroundDirection.multiplyScalar(0.6);
        dirToPlayer.multiplyScalar(0.4);
        aroundDirection.add(dirToPlayer);
        aroundDirection.normalize();

        return aroundDirection;
    }

    calculateHuntingPath(playerPosition, obstacles) {
        // Try different directions to find the player
        const dirToPlayer = new THREE.Vector3().subVectors(
            playerPosition, this.mesh.position
        ).normalize();

        // Create a wider zigzag pattern
        const huntDir = new THREE.Vector3();

        // Oscillate direction based on time - faster oscillation (was 500ms)
        const zigzagFactor = Math.sin(Date.now() / 300) * 1.0; // Increased amplitude (was 0.8)

        // Create a zigzag perpendicular to player direction
        const perpendicular = new THREE.Vector3(dirToPlayer.z, 0, -dirToPlayer.x);
        perpendicular.multiplyScalar(zigzagFactor);

        // Combine with forward direction
        huntDir.addVectors(dirToPlayer, perpendicular);
        huntDir.normalize();

        // Check if this direction would cause collision
        const testPosition = this.mesh.position.clone().add(
            huntDir.clone().multiplyScalar(0.5)
        );

        // Create a collision test box
        const testBox = new THREE.Box3();
        testBox.setFromCenterAndSize(
            testPosition,
            new THREE.Vector3(1, 2, 1) // Enemy size
        );

        // Check for collisions
        let wouldCollide = false;
        for (const obstacle of obstacles) {
            if (!obstacle.mesh) continue;

            const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);
            if (testBox.intersectsBox(obstacleBox)) {
                wouldCollide = true;
                break;
            }
        }

        // If would collide, try different direction
        if (wouldCollide) {
            // Reflect and try again with more randomness
            huntDir.set(
                dirToPlayer.x + (Math.random() - 0.5) * 1.0, // Increased randomness (was 0.6)
                0,
                dirToPlayer.z + (Math.random() - 0.5) * 1.0
            ).normalize();
        }

        return huntDir;
    }

    updatePath(playerPosition, otherEnemies, obstacles) {
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        // If player is out of detection range and we don't remember their position, wander randomly
        if (distanceToPlayer > this.detectionRadius && !this.lastKnownPlayerPosition) {
            this.wander();
            this.pathfindingMode = 'direct'; // Reset pathfinding mode
        }
        // If direct line of sight to player, use direct path
        else if (this.hasLineOfSightToPlayer(playerPosition, obstacles)) {
            this.moveDirection.subVectors(playerPosition, this.mesh.position).normalize();
            this.pathfindingMode = 'direct';
        }
        // If we remember player's position but can't see them, hunt more aggressively
        else if (this.lastKnownPlayerPosition && this.pathfindingMode === 'direct') {
            // Switch to hunting mode if we remember where the player was but can't see them
            this.pathfindingMode = 'hunting';
            this.huntingTimeout = 0;
        }
    }

    updateHealthBar() {
        if (this.healthBarForeground) {
            // Scale health bar based on current health percentage
            const healthPercent = this.health / this.maxHealth;
            this.healthBarForeground.scale.x = Math.max(0, healthPercent);

            // Center the scaled health bar (since scaling happens from center)
            this.healthBarForeground.position.x = (healthPercent - 1) * 0.6;

            // Change color based on health level
            if (healthPercent < 0.3) {
                this.healthBarForeground.material.color.setHex(0xff0000); // Red
            } else if (healthPercent < 0.6) {
                this.healthBarForeground.material.color.setHex(0xffff00); // Yellow
            } else {
                this.healthBarForeground.material.color.setHex(0x00ff00); // Green
            }
        }
    }

    tryShootAtPlayer(playerPosition, obstacles) {
        // Check if we have line of sight to the player
        if (this.hasLineOfSightToPlayer(playerPosition, obstacles)) {
            this.shoot(playerPosition);
            this.canShoot = false;
            return true;
        }
        return false;
    }

    hasLineOfSightToPlayer(playerPosition, obstacles) {
        // Use raycasting to check if there's a clear line of sight to the player
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();

        const raycaster = new THREE.Raycaster(
            this.mesh.position.clone(),
            direction,
            0,
            this.mesh.position.distanceTo(playerPosition)
        );

        // Get obstacle meshes for raycasting
        const obstacleMeshes = obstacles.map(obstacle => obstacle.mesh);

        // Check for intersections with obstacles
        const intersects = raycaster.intersectObjects(obstacleMeshes);

        // If there are no intersections, we have a clear line of sight
        return intersects.length === 0;
    }

    shoot(playerPosition) {
        // Show muzzle flash
        this.showMuzzleFlash();

        // Create bullet trail effect
        this.createBulletTrail(playerPosition);

        // Return damage amount if hit, based on accuracy
        return Math.random() < this.shootAccuracy ? this.shootDamage : 0;
    }

    showMuzzleFlash() {
        // Show muzzle flash
        this.muzzleFlash.visible = true;

        // Hide after a short time
        setTimeout(() => {
            this.muzzleFlash.visible = false;
        }, 50);
    }

    createBulletTrail(playerPosition) {
        // Create a line for the bullet trail
        const material = new THREE.LineBasicMaterial({
            color: 0xff5500,
            opacity: 0.7,
            transparent: true
        });

        // Calculate start and end positions
        const startPosition = this.mesh.position.clone();
        startPosition.y += 1; // Adjust to shoot from "head" height

        // Add some randomness to the end position for missed shots
        const endPosition = playerPosition.clone();
        if (Math.random() > this.shootAccuracy) {
            // Add random deviation for missed shots
            endPosition.x += (Math.random() - 0.5) * 2;
            endPosition.y += (Math.random() - 0.5) * 2;
            endPosition.z += (Math.random() - 0.5) * 2;
        }

        // Create the bullet trail
        const points = [startPosition, endPosition];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);

        // Add to scene
        this.scene.add(line);

        // Remove after a short time
        setTimeout(() => {
            this.scene.remove(line);
        }, 100);
    }

    checkObstacleCollisions(obstacles) {
        // Create enemy bounding box
        const enemyBox = new THREE.Box3().setFromObject(this.mesh);

        // Check collision with each obstacle
        for (const obstacle of obstacles) {
            if (!obstacle.mesh) continue;

            const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);

            if (enemyBox.intersectsBox(obstacleBox)) {
                return true; // Collision detected
            }
        }

        return false; // No collision
    }

    wander() {
        // Random movement within the map
        this.moveDirection.set(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
    }

    applyEnemyAvoidance(otherEnemies) {
        if (!otherEnemies) return;

        // Avoid other enemies
        const avoidanceForce = new THREE.Vector3();

        for (const enemy of otherEnemies) {
            // Skip self
            if (enemy === this) continue;

            const distance = this.mesh.position.distanceTo(enemy.mesh.position);

            // Only avoid if within avoidance radius
            if (distance < this.avoidanceRadius) {
                // Calculate avoidance direction (away from other enemy)
                const avoidDir = new THREE.Vector3().subVectors(
                    this.mesh.position,
                    enemy.mesh.position
                ).normalize();

                // Stronger force the closer we are
                const force = (this.avoidanceRadius - distance) / this.avoidanceRadius;
                avoidDir.multiplyScalar(force);

                // Accumulate avoidance forces
                avoidanceForce.add(avoidDir);
            }
        }

        // If there's an avoidance force, apply it to the movement direction
        if (avoidanceForce.length() > 0) {
            // Blend between current direction and avoidance (higher weight for avoidance)
            this.moveDirection.add(avoidanceForce.multiplyScalar(1.5));
            this.moveDirection.normalize();
        }
    }

    takeDamage(amount) {
        this.health -= amount;

        // Update health bar
        this.updateHealthBar();

        // Flash white when hit
        const originalColor = this.mesh.material.color.clone();
        this.mesh.material.color.set(0xffffff);

        setTimeout(() => {
            this.mesh.material.color.copy(originalColor);
        }, 100);

        return this.health <= 0;
    }

    // Debug visualization
    clearDebugMarkers() {
        for (const marker of this.debugMarkers) {
            this.scene.remove(marker);
        }
        this.debugMarkers = [];
    }
} 