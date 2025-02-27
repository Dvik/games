export class Enemy {
    constructor(position, scene) {
        this.scene = scene;
        this.speed = 2.0;
        this.health = 100;
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

        // Movement properties
        this.moveDirection = new THREE.Vector3();
        this.tempVector = new THREE.Vector3();
        this.previousPosition = new THREE.Vector3();

        // Path finding variables
        this.pathUpdateTime = 0;
        this.pathUpdateInterval = 0.5; // Update path every 0.5 seconds

        // Random movement within range of player
        this.wanderRadius = 15;
        this.detectionRadius = 20;
        this.attackRadius = 10;

        // Collision avoidance
        this.avoidanceRadius = 2.5; // Distance to start avoiding other enemies

        // Shooting properties
        this.canShoot = true;
        this.shootCooldown = 2.0; // Time between shots in seconds
        this.shootTimer = 0;
        this.shootRange = 15; // Maximum shooting range
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
    }

    update(delta, playerPosition, otherEnemies, obstacles) {
        // Store previous position for collision resolution
        this.previousPosition.copy(this.mesh.position);

        // Path finding update (simplified)
        this.pathUpdateTime += delta;

        if (this.pathUpdateTime >= this.pathUpdateInterval) {
            this.pathUpdateTime = 0;
            this.updatePath(playerPosition, otherEnemies);
        }

        // Move enemy
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        // Only move if within detection radius but not too close
        if (distanceToPlayer < this.detectionRadius && distanceToPlayer > 1.5) {
            // Calculate direction to player
            this.moveDirection.subVectors(playerPosition, this.mesh.position).normalize();

            // Apply enemy avoidance to the movement direction
            this.applyEnemyAvoidance(otherEnemies);

            // Move towards player
            const moveSpeed = this.speed * delta;
            this.tempVector.copy(this.moveDirection).multiplyScalar(moveSpeed);

            // Only move on X and Z axes (keep Y position fixed to ground)
            this.mesh.position.x += this.tempVector.x;
            this.mesh.position.z += this.tempVector.z;

            // Check for collisions with obstacles
            if (obstacles && this.checkObstacleCollisions(obstacles)) {
                // If collision with obstacle, revert to previous position
                this.mesh.position.copy(this.previousPosition);
            }

            // Face towards player
            this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
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

    updatePath(playerPosition, otherEnemies) {
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        // If player is out of detection range, wander randomly
        if (distanceToPlayer > this.detectionRadius) {
            this.wander();
        }
        // If player is within attack range, move towards player
        else if (distanceToPlayer <= this.attackRadius) {
            this.moveDirection.subVectors(playerPosition, this.mesh.position).normalize();
        }
        // Otherwise, move towards player but more cautiously
        else {
            this.moveDirection.subVectors(playerPosition, this.mesh.position).normalize();

            // Add some randomness to movement
            this.moveDirection.x += (Math.random() - 0.5) * 0.3;
            this.moveDirection.z += (Math.random() - 0.5) * 0.3;
            this.moveDirection.normalize();
        }

        // Apply enemy avoidance
        this.applyEnemyAvoidance(otherEnemies);
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

    wander() {
        // Random movement within the map
        this.moveDirection.set(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
    }

    takeDamage(amount) {
        this.health -= amount;

        // Flash red when hit
        const originalColor = this.mesh.material.color.clone();
        this.mesh.material.color.set(0xffffff);

        setTimeout(() => {
            this.mesh.material.color.copy(originalColor);
        }, 100);

        return this.health <= 0;
    }
} 