export class Weapon {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;

        // Weapon properties
        this.damage = 50;
        this.reloadTime = 1.5; // seconds
        this.isReloading = false;

        // Muzzle flash
        this.muzzleFlash = this.createMuzzleFlash();
        this.muzzleFlash.visible = false;
        scene.add(this.muzzleFlash);

        // Weapon model (simple box for now)
        this.model = this.createWeaponModel();
        scene.add(this.model);

        // Bullet trail
        this.bulletTrails = [];

        // Bullet impact
        this.impacts = [];
    }

    createWeaponModel() {
        // Simple weapon model (a box)
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const model = new THREE.Mesh(geometry, material);

        // Position the weapon in front of the camera
        model.position.set(0.3, -0.3, -0.5);

        // Add the weapon model as a child of the camera
        this.camera.add(model);

        return model;
    }

    createMuzzleFlash() {
        // Simple muzzle flash (a point light)
        const light = new THREE.PointLight(0xffff00, 5, 2);
        light.position.set(0.3, -0.3, -1.0);

        // Add the muzzle flash as a child of the camera
        this.camera.add(light);

        return light;
    }

    shoot() {
        if (this.isReloading) return;

        // Show muzzle flash
        this.showMuzzleFlash();

        // Create bullet trail
        this.createBulletTrail();

        // The impact will be created by the game.js checkEnemyHits function
        // as it needs to check for both obstacles and enemies
    }

    showMuzzleFlash() {
        // Show muzzle flash
        this.muzzleFlash.visible = true;

        // Hide muzzle flash after a short time
        setTimeout(() => {
            this.muzzleFlash.visible = false;
        }, 50);
    }

    createBulletTrail() {
        // Create a line for the bullet trail
        const material = new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.5, transparent: true });

        // Get the direction the camera is facing
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        // Calculate start and end positions
        const startPosition = new THREE.Vector3(0.3, -0.3, -0.7);
        this.camera.localToWorld(startPosition.clone());

        const endPosition = new THREE.Vector3();
        endPosition.copy(startPosition).add(direction.multiplyScalar(100));

        // Create the bullet trail
        const geometry = new THREE.BufferGeometry().setFromPoints([startPosition, endPosition]);
        const line = new THREE.Line(geometry, material);

        // Add to scene
        this.scene.add(line);

        // Add to bullet trails array
        this.bulletTrails.push(line);

        // Remove after a short time
        setTimeout(() => {
            this.scene.remove(line);
            const index = this.bulletTrails.indexOf(line);
            if (index !== -1) {
                this.bulletTrails.splice(index, 1);
            }
        }, 100);
    }

    // Updated to accept a direct impact point or use raycasting if not provided
    createBulletImpact(impactPoint) {
        let impactPosition;

        if (impactPoint) {
            // Use the provided impact point
            impactPosition = impactPoint;
        } else {
            // Use raycasting to find impact point
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

            // Check for intersections with scene objects
            const intersects = raycaster.intersectObjects(this.scene.children, true);

            if (intersects.length > 0) {
                impactPosition = intersects[0].point;
            } else {
                // No impact found
                return;
            }
        }

        // Create impact marker (small sphere)
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const impact = new THREE.Mesh(geometry, material);

        impact.position.copy(impactPosition);
        this.scene.add(impact);

        // Add to impacts array
        this.impacts.push(impact);

        // Remove after a few seconds
        setTimeout(() => {
            this.scene.remove(impact);
            const index = this.impacts.indexOf(impact);
            if (index !== -1) {
                this.impacts.splice(index, 1);
            }
        }, 3000);
    }

    reload() {
        if (this.isReloading) return;

        this.isReloading = true;

        // Reload animation could go here

        // Reset after reload time
        setTimeout(() => {
            this.isReloading = false;
        }, this.reloadTime * 1000);
    }

    update() {
        // Update weapon position to follow camera
        // If we had weapon sway, it would go here
    }
} 