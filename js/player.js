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

        // Apply vertical velocity (jumping/falling)
        this.camera.position.y += this.velocity.y * delta;

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