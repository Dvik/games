export class Player {
    constructor(camera, controls, scene) {
        this.camera = camera;
        this.controls = controls;
        this.scene = scene;

        // Movement flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        // Movement speed - increased for larger map
        this.speed = 8.0; // Increased from 5.0 to 8.0

        // Gravity and jumping
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.canJump = true;
        this.gravity = 20.0;
        this.jumpHeight = 10.0;

        // Collision detection
        this.raycaster = new THREE.Raycaster();
        this.playerHeight = 1.6; // Player height in meters

        // Store obstacles reference
        this.obstacles = [];

        // Floor level
        this.floorY = 0;
    }

    update(delta) {
        // Apply gravity
        this.velocity.y -= this.gravity * delta;

        // Get movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Move the player
        if (this.moveForward || this.moveBackward) {
            this.controls.moveForward(this.direction.z * this.speed * delta);
        }

        if (this.moveLeft || this.moveRight) {
            this.controls.moveRight(this.direction.x * this.speed * delta);
        }

        // Store previous Y position before applying vertical movement
        const previousY = this.camera.position.y;

        // Apply vertical velocity (jumping/falling)
        this.camera.position.y += this.velocity.y * delta;

        // Check for obstacle collision in vertical direction
        this.checkVerticalObstacleCollision(previousY);

        // Check for floor collision
        if (this.camera.position.y < this.floorY + this.playerHeight) {
            this.velocity.y = 0;
            this.camera.position.y = this.floorY + this.playerHeight;
            this.canJump = true;
        }

        // Check for wall collisions (simple implementation)
        this.checkWallCollisions();

        // Check for map boundaries (simple implementation)
        this.checkMapBoundaries();
    }

    // Set obstacles reference from game
    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    checkVerticalObstacleCollision(previousY) {
        if (!this.obstacles || this.obstacles.length === 0) return;

        // Create player collision box
        const playerBox = new THREE.Box3();
        playerBox.setFromCenterAndSize(
            this.camera.position,
            new THREE.Vector3(0.5, 1.6, 0.5) // Player size
        );

        // If player is moving downward (falling or after jump apex)
        if (this.camera.position.y < previousY) {
            let highestObstacleY = this.floorY;
            let standingOnObstacle = false;

            // Check each obstacle to see if player can stand on it
            for (const obstacle of this.obstacles) {
                if (!obstacle.mesh) continue;

                // Get obstacle bounding box
                const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);

                // Check if player is directly above the obstacle (X-Z overlap)
                const playerBottom = playerBox.clone();
                playerBottom.min.y = previousY - 0.2; // Slightly below previous position
                playerBottom.max.y = previousY; // Previous position

                // Create a box that represents the top of the obstacle
                const obstacleTop = obstacleBox.clone();
                obstacleTop.min.y = obstacleBox.max.y - 0.1; // Just the top of the obstacle

                // If player's bottom intersects with obstacle top and player is falling onto it
                if (playerBottom.intersectsBox(obstacleBox) &&
                    previousY > obstacleBox.max.y &&
                    this.camera.position.y <= obstacleBox.max.y + this.playerHeight) {

                    // Check if this obstacle is higher than previously found obstacles
                    if (obstacleBox.max.y > highestObstacleY) {
                        highestObstacleY = obstacleBox.max.y;
                        standingOnObstacle = true;
                    }
                }
            }

            // If player can stand on an obstacle, adjust position and reset velocity
            if (standingOnObstacle) {
                this.camera.position.y = highestObstacleY + this.playerHeight;
                this.velocity.y = 0;
                this.canJump = true;
            }
        }
    }

    jump() {
        if (this.canJump) {
            this.velocity.y = this.jumpHeight;
            this.canJump = false;
        }
    }

    checkWallCollisions() {
        // Simple wall collision detection using raycaster
        const directions = [
            new THREE.Vector3(1, 0, 0),   // Right
            new THREE.Vector3(-1, 0, 0),  // Left
            new THREE.Vector3(0, 0, 1),   // Forward
            new THREE.Vector3(0, 0, -1)   // Backward
        ];

        const position = this.camera.position.clone();

        for (let i = 0; i < directions.length; i++) {
            this.raycaster.set(position, directions[i]);

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0 && intersects[0].distance < 0.5) {
                // If too close to a wall, push the player back
                const pushBack = directions[i].clone().multiplyScalar(-0.1);
                this.camera.position.add(pushBack);
            }
        }

        // Also check for small steps that the player can climb
        this.checkForStepUp();
    }

    checkForStepUp() {
        if (!this.obstacles || this.obstacles.length === 0) return;

        // Only check when player is on ground or obstacle (not jumping)
        if (!this.canJump) return;

        // Direction player is trying to move
        const moveDirection = new THREE.Vector3();

        if (this.moveForward) moveDirection.z -= 1;
        if (this.moveBackward) moveDirection.z += 1;
        if (this.moveLeft) moveDirection.x -= 1;
        if (this.moveRight) moveDirection.x += 1;

        // If not moving, don't check
        if (moveDirection.lengthSq() === 0) return;

        moveDirection.normalize();

        // Ray start position: slightly above player's feet
        const rayStart = this.camera.position.clone();
        rayStart.y -= this.playerHeight - 0.1;

        // Cast ray in movement direction
        this.raycaster.set(rayStart, moveDirection);

        // Maximum step height player can climb
        const maxStepHeight = 0.5;

        // Check obstacles for potential steps
        for (const obstacle of this.obstacles) {
            if (!obstacle.mesh) continue;

            const obstacleIntersects = this.raycaster.intersectObject(obstacle.mesh);

            if (obstacleIntersects.length > 0 && obstacleIntersects[0].distance < 0.7) {
                // Get obstacle top position
                const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);
                const obstacleTopY = obstacleBox.max.y;

                // Get player's current standing position
                const playerStandingY = this.camera.position.y - this.playerHeight;

                // Calculate height difference
                const heightDiff = obstacleTopY - playerStandingY;

                // If obstacle is higher but within step height range
                if (heightDiff > 0 && heightDiff <= maxStepHeight) {
                    // Step up onto obstacle
                    this.camera.position.y = obstacleTopY + this.playerHeight;
                    return; // Stop after first step up
                }
            }
        }
    }

    checkMapBoundaries() {
        // Updated map boundary check for larger map
        const mapSize = 150; // Updated from 50 to match map.js

        if (Math.abs(this.camera.position.x) > mapSize / 2) {
            this.camera.position.x = Math.sign(this.camera.position.x) * mapSize / 2;
        }

        if (Math.abs(this.camera.position.z) > mapSize / 2) {
            this.camera.position.z = Math.sign(this.camera.position.z) * mapSize / 2;
        }
    }
} 