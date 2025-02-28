export class Enemy {
    constructor(position, scene) {
        console.log('Creating new enemy:', position);
        this.scene = scene;
        this.speed = 3.5;
        this.health = 100;
        this.maxHealth = 100; // Keep max health for damage calculations
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

        // Add mesh to scene
        scene.add(this.mesh);
        console.log('Enemy added to scene');

        // Movement properties
        this.moveDirection = new THREE.Vector3();
        this.tempVector = new THREE.Vector3();
        this.previousPosition = new THREE.Vector3();

        // Path finding variables
        this.pathUpdateTime = 0;
        this.pathUpdateInterval = 0.08;

        // Improved pathfinding properties
        this.isStuck = false;
        this.stuckTime = 0;
        this.stuckThreshold = 0.2;
        this.lastPositions = [];
        this.pathfindingMode = 'direct';
        this.pathSwitchTime = 0;
        this.currentPathDirection = null;
        this.huntingTimeout = 0;
        this.lastKnownPlayerPosition = null;
        this.memory = 15;
        this.memoryTimer = 0;

        // Add a teleport recovery for severely stuck enemies
        this.severelyStuckTime = 0;
        this.teleportThreshold = 3.0;

        // Random movement within range of player
        this.wanderRadius = 15;
        this.detectionRadius = 50;
        this.attackRadius = 15;

        // Collision avoidance
        this.avoidanceRadius = 2.5;

        // Shooting properties
        this.canShoot = true;
        this.shootCooldown = 2.0;
        this.shootTimer = 0;
        this.shootRange = 20;
        this.shootDamage = 5;
        this.shootAccuracy = 0.95;

        // Create the muzzle flash
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.set(0, 0, -0.6);
        this.mesh.add(this.muzzleFlash);
        this.muzzleFlash.visible = false;

        // Debug visualization for pathfinding (if enabled)
        this.debugMode = false;
        this.debugMarkers = [];

        // Track wall sliding direction
        this.wallSlideDirection = null;
        this.wallHitCount = 0;
    }

    update(delta, playerPosition, otherEnemies, obstacles) {
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
            this.severelyStuckTime += delta;

            // Try to unstuck regularly
            if (this.stuckTime > this.stuckThreshold) {
                // Switch pathfinding mode if stuck for too long
                this.switchPathfindingMode(obstacles, playerPosition);
                this.stuckTime = 0;
            }

            // Emergency teleport if severely stuck for too long
            if (this.severelyStuckTime > this.teleportThreshold) {
                this.emergencyUnstuck(obstacles, playerPosition);
                this.severelyStuckTime = 0;
            }
        } else {
            // If not stuck, gradually reduce severely stuck time
            this.severelyStuckTime = Math.max(0, this.severelyStuckTime - delta);
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

            // Try wall sliding movement with separate X and Z axis checks
            const wallCollisionX = this.tryMoveWithWallSlide(this.tempVector.x, 0, obstacles);
            const wallCollisionZ = this.tryMoveWithWallSlide(0, this.tempVector.z, obstacles);

            // If we hit walls on both X and Z axes, we're probably in a corner
            if (wallCollisionX && wallCollisionZ) {
                this.isStuck = true;
                this.wallHitCount++;

                // If hitting walls repeatedly, try a more drastic approach
                if (this.wallHitCount > 3) {
                    this.attemptCornerEscape(obstacles);
                    this.wallHitCount = 0;
                }
            } else if (!wallCollisionX && !wallCollisionZ) {
                // If we successfully moved, reset stuck status
                this.isStuck = false;
                this.stuckTime = 0;
                this.wallHitCount = Math.max(0, this.wallHitCount - 1);
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
        if (this.lastPositions.length >= 3) {
            let totalMovement = 0;
            for (let i = 1; i < this.lastPositions.length; i++) {
                totalMovement += this.lastPositions[i].distanceTo(this.lastPositions[i - 1]);
            }

            // If total movement over last 3 frames is very small, consider stuck
            if (totalMovement < 0.05) {
                this.isStuck = true;
            }
        }
    }

    switchPathfindingMode(obstacles, playerPosition) {
        // If we've been in hunting mode for too long without progress, try a completely random direction
        if (this.pathfindingMode === 'hunting' && this.huntingTimeout > 3) {
            // Try more extreme random movement
            const randomAngle = Math.random() * Math.PI * 2;
            this.moveDirection.set(
                Math.cos(randomAngle) * 1.5,
                0,
                Math.sin(randomAngle) * 1.5
            ).normalize();

            // Reset path optimization to prevent getting stuck in a loop
            this.wallSlideDirection = null;
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

                // Find perpendicular vector with more variation in angle
                const perpAngle = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
                // Add some randomness to the perpendicular angle
                const jitterAngle = perpAngle + (Math.random() - 0.5) * 0.5;

                // Calculate direction from angle
                this.currentPathDirection = new THREE.Vector3(
                    dirToPlayer.x * Math.cos(jitterAngle) - dirToPlayer.z * Math.sin(jitterAngle),
                    0,
                    dirToPlayer.x * Math.sin(jitterAngle) + dirToPlayer.z * Math.cos(jitterAngle)
                );
                break;

            case 'around':
                // If around path doesn't work, try hunting mode with different direction
                this.pathfindingMode = 'hunting';
                this.huntingTimeout = 0;

                // Try the opposite direction with some randomness
                if (this.currentPathDirection) {
                    this.currentPathDirection.negate();
                    this.currentPathDirection.x += (Math.random() - 0.5) * 0.5;
                    this.currentPathDirection.z += (Math.random() - 0.5) * 0.5;
                    this.currentPathDirection.normalize();
                }
                break;

            case 'hunting':
                // If hunting doesn't work, try extreme angles for around path
                this.pathfindingMode = 'around';

                // Try a random direction with more extreme variation
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

        // Blend 50% side movement, 50% toward player (was 60/40)
        aroundDirection.multiplyScalar(0.5);
        dirToPlayer.multiplyScalar(0.5);
        aroundDirection.add(dirToPlayer);
        aroundDirection.normalize();

        return aroundDirection;
    }

    calculateHuntingPath(targetPosition, obstacles) {
        // Try different directions to find the player
        const dirToPlayer = new THREE.Vector3().subVectors(
            targetPosition, this.mesh.position
        ).normalize();

        // Create a wider zigzag pattern
        const huntDir = new THREE.Vector3();

        // Oscillate direction based on time - even faster oscillation (was 300ms)
        const zigzagFactor = Math.sin(Date.now() / 200) * 1.2; // Increased amplitude (was 1.0)

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
            // Reflect and try again with even more randomness
            huntDir.set(
                dirToPlayer.x + (Math.random() - 0.5) * 1.5, // Increased randomness (was 1.0)
                0,
                dirToPlayer.z + (Math.random() - 0.5) * 1.5
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
            // Add reduced random deviation for missed shots (more accurate)
            endPosition.x += (Math.random() - 0.5) * 0.2; // Reduced from 2 to 1.2
            endPosition.y += (Math.random() - 0.5) * 0.2; // Reduced from 2 to 1.2
            endPosition.z += (Math.random() - 0.5) * 0.2; // Reduced from 2 to 1.2
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

        // Flash white when hit
        const originalColor = this.mesh.material.color.clone();
        this.mesh.material.color.set(0xffffff);

        setTimeout(() => {
            this.mesh.material.color.copy(originalColor);
        }, 100);

        // If enemy is killed, create an explosion
        if (this.health <= 0) {
            this.createExplosion();
            return true;
        }

        return false;
    }

    // Add explosion effect
    createExplosion() {
        // Create explosion center at enemy position
        const position = this.mesh.position.clone();

        // Create particle system for explosion
        const particleCount = 30;
        const particles = [];

        // Create fragments/particles
        for (let i = 0; i < particleCount; i++) {
            // Create particles with random colors from red to orange to yellow
            const colorRandom = Math.random();
            let color;

            if (colorRandom < 0.6) {
                color = 0xff0000; // Red
            } else if (colorRandom < 0.8) {
                color = 0xff6600; // Orange
            } else {
                color = 0xffff00; // Yellow
            }

            // Random size for particles
            const size = 0.1 + Math.random() * 0.3;

            // Create particle geometry and material
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });

            // Create particle mesh
            const particle = new THREE.Mesh(geometry, material);

            // Set initial position to enemy position
            particle.position.copy(position);

            // Add random offset to initial position
            particle.position.x += (Math.random() - 0.5) * 0.5;
            particle.position.y += Math.random() * 0.5;
            particle.position.z += (Math.random() - 0.5) * 0.5;

            // Calculate random velocity direction
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );

            // Store velocity with particle
            particle.userData.velocity = velocity;
            particle.userData.lifetime = 1 + Math.random() * 0.5; // Lifetime in seconds

            // Add to scene
            this.scene.add(particle);
            particles.push(particle);
        }

        // Create a flash of light at explosion center
        const light = new THREE.PointLight(0xff5500, 5, 8);
        light.position.copy(position);
        this.scene.add(light);

        // Animate explosion
        const startTime = Date.now();
        const maxTime = 1500; // 1.5 seconds

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const normalizedTime = Math.min(elapsed / maxTime, 1.0);

            if (normalizedTime < 1.0) {
                // Update each particle
                for (let i = 0; i < particles.length; i++) {
                    const particle = particles[i];
                    const velocity = particle.userData.velocity;

                    // Apply velocity
                    particle.position.x += velocity.x * 0.01;
                    particle.position.y += velocity.y * 0.01;
                    particle.position.z += velocity.z * 0.01;

                    // Add gravity effect
                    velocity.y -= 0.05;

                    // Scale down and fade out
                    const particleLife = normalizedTime / particle.userData.lifetime;
                    if (particleLife < 1.0) {
                        particle.scale.set(1 - particleLife, 1 - particleLife, 1 - particleLife);
                        particle.material.opacity = 0.8 * (1 - particleLife);
                    } else {
                        // Remove particle if its lifetime is over
                        this.scene.remove(particle);
                        particles[i] = null;
                    }
                }

                // Filter out removed particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    if (particles[i] === null) {
                        particles.splice(i, 1);
                    }
                }

                // Update light intensity
                light.intensity = 5 * (1 - normalizedTime);

                requestAnimationFrame(animate);
            } else {
                // Cleanup any remaining particles
                for (const particle of particles) {
                    if (particle) this.scene.remove(particle);
                }

                // Remove light
                this.scene.remove(light);
            }
        };

        // Start animation
        requestAnimationFrame(animate);
    }

    // Debug visualization
    clearDebugMarkers() {
        for (const marker of this.debugMarkers) {
            this.scene.remove(marker);
        }
        this.debugMarkers = [];
    }

    // New method to try movement with wall sliding
    tryMoveWithWallSlide(dx, dz, obstacles) {
        // Update position
        this.mesh.position.x += dx;
        this.mesh.position.z += dz;

        // Check for collisions
        if (obstacles && this.checkObstacleCollisions(obstacles)) {
            // Collision detected, revert the move
            this.mesh.position.x -= dx;
            this.mesh.position.z -= dz;

            // Try to slide along the wall instead
            if (Math.abs(dx) > 0.001) {
                // We were moving on X axis, try Z slide
                this.wallSlideDirection = 'z';

                // Try sliding up or down Z axis
                for (const zMult of [0.8, -0.8, 1.2, -1.2]) {
                    this.mesh.position.z += Math.abs(dx) * zMult;
                    if (!this.checkObstacleCollisions(obstacles)) {
                        // Successfully slid along wall
                        return false;
                    }
                    // Didn't work, revert
                    this.mesh.position.z -= Math.abs(dx) * zMult;
                }
            }

            if (Math.abs(dz) > 0.001) {
                // We were moving on Z axis, try X slide
                this.wallSlideDirection = 'x';

                // Try sliding left or right on X axis
                for (const xMult of [0.8, -0.8, 1.2, -1.2]) {
                    this.mesh.position.x += Math.abs(dz) * xMult;
                    if (!this.checkObstacleCollisions(obstacles)) {
                        // Successfully slid along wall
                        return false;
                    }
                    // Didn't work, revert
                    this.mesh.position.x -= Math.abs(dz) * xMult;
                }
            }

            // Sliding failed, we're stuck against this wall
            return true;
        }

        // No collision
        return false;
    }

    // Method to attempt escaping from a corner
    attemptCornerEscape(obstacles) {
        // If stuck in a corner, try more drastic moves in various directions
        const escapeDirections = [
            { x: 1, z: 0 },
            { x: -1, z: 0 },
            { x: 0, z: 1 },
            { x: 0, z: -1 },
            { x: 0.7, z: 0.7 },
            { x: -0.7, z: 0.7 },
            { x: 0.7, z: -0.7 },
            { x: -0.7, z: -0.7 }
        ];

        // Shuffle escape directions for randomness
        escapeDirections.sort(() => Math.random() - 0.5);

        // Try each direction with a larger step
        for (const dir of escapeDirections) {
            const originalPos = this.mesh.position.clone();

            // Try a larger movement in this direction
            this.mesh.position.x += dir.x * 1.5;
            this.mesh.position.z += dir.z * 1.5;

            if (!this.checkObstacleCollisions(obstacles)) {
                // We escaped!
                if (this.debugMode) {
                    console.log("Corner escape successful!");
                }
                return true;
            }

            // Return to original position and try next direction
            this.mesh.position.copy(originalPos);
        }

        // Could not escape by normal means
        return false;
    }

    // Last resort teleport for enemies that can't escape
    emergencyUnstuck(obstacles, playerPosition) {
        // This is only used when an enemy is stuck for a very long time
        if (this.lastKnownPlayerPosition) {
            // Get direction to player's last known position
            const dirToPlayer = new THREE.Vector3().subVectors(
                this.lastKnownPlayerPosition, this.mesh.position
            ).normalize();

            // Try to find a position further ahead in the general direction of the player
            const attempts = 10;
            let success = false;

            for (let i = 0; i < attempts; i++) {
                // Random distance between 3 and 8 units ahead
                const distance = 3 + Math.random() * 5;

                // Add some randomness to the direction
                const jitterDir = dirToPlayer.clone();
                jitterDir.x += (Math.random() - 0.5) * 0.5;
                jitterDir.z += (Math.random() - 0.5) * 0.5;
                jitterDir.normalize();

                // Calculate new position
                const newPos = this.mesh.position.clone().add(
                    jitterDir.multiplyScalar(distance)
                );

                // Save current position
                const originalPos = this.mesh.position.clone();

                // Try the new position
                this.mesh.position.copy(newPos);

                if (!this.checkObstacleCollisions(obstacles)) {
                    // Valid position found!
                    success = true;
                    break;
                }

                // Revert position
                this.mesh.position.copy(originalPos);
            }

            if (success) {
                // Reset pathfinding after teleport
                this.pathfindingMode = 'direct';
                this.isStuck = false;
                this.stuckTime = 0;
                this.severelyStuckTime = 0;
                this.wallHitCount = 0;

                // Create a visual effect for the teleport
                this.createTeleportEffect();

                if (this.debugMode) {
                    console.log("Emergency teleport successful!");
                }
            }
        }
    }

    createTeleportEffect() {
        // Create a visual effect for teleportation
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });

        // Create several particles
        for (let i = 0; i < 10; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(this.mesh.position);

            // Random offset
            particle.position.x += (Math.random() - 0.5) * 1.0;
            particle.position.y += Math.random() * 2;
            particle.position.z += (Math.random() - 0.5) * 1.0;

            this.scene.add(particle);

            // Animate and remove particle
            const startTime = Date.now();
            const lifetime = 500 + Math.random() * 500;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed < lifetime) {
                    // Scale down and fade out
                    const progress = elapsed / lifetime;
                    particle.scale.set(1 - progress, 1 - progress, 1 - progress);
                    particle.material.opacity = 0.8 * (1 - progress);

                    // Continue animation
                    requestAnimationFrame(animate);
                } else {
                    // Remove particle
                    this.scene.remove(particle);
                }
            };

            // Start animation
            requestAnimationFrame(animate);
        }
    }
} 