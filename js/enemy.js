export class Enemy {
    constructor(position, scene) {
        this.scene = scene;
        this.speed = 2.0;
        this.health = 100;

        // Create enemy mesh
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add mesh to scene
        scene.add(this.mesh);

        // Movement properties
        this.moveDirection = new THREE.Vector3();
        this.tempVector = new THREE.Vector3();

        // Path finding variables
        this.pathUpdateTime = 0;
        this.pathUpdateInterval = 0.5; // Update path every 0.5 seconds

        // Random movement within range of player
        this.wanderRadius = 15;
        this.detectionRadius = 20;
        this.attackRadius = 10;
    }

    update(delta, playerPosition) {
        // Path finding update (simplified)
        this.pathUpdateTime += delta;

        if (this.pathUpdateTime >= this.pathUpdateInterval) {
            this.pathUpdateTime = 0;
            this.updatePath(playerPosition);
        }

        // Move enemy
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        // Only move if within detection radius but not too close
        if (distanceToPlayer < this.detectionRadius && distanceToPlayer > 1.5) {
            // Calculate direction to player
            this.moveDirection.subVectors(playerPosition, this.mesh.position).normalize();

            // Move towards player
            const moveSpeed = this.speed * delta;
            this.tempVector.copy(this.moveDirection).multiplyScalar(moveSpeed);

            // Only move on X and Z axes (keep Y position fixed to ground)
            this.mesh.position.x += this.tempVector.x;
            this.mesh.position.z += this.tempVector.z;

            // Face towards player
            this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
        }
    }

    updatePath(playerPosition) {
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