// Array to store all obstacles for collision detection
const obstacles = [];

export function createMap(scene) {
    // Clear existing obstacles
    obstacles.length = 0;

    // Create ground
    createGround(scene);

    // Create walls
    createWalls(scene);

    // Create obstacles
    createObstacles(scene);

    // Create buildings
    createBuildings(scene);

    // Create military structures
    createMilitaryStructures(scene);

    // Create urban elements
    createUrbanElements(scene);

    // Create terrain features
    createTerrainFeatures(scene);

    // Create sky
    createSky(scene);

    // Return obstacles array for collision detection
    return obstacles;
}

function createGround(scene) {
    // Create ground plane - INCREASED SIZE from 100 to 300
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.8,
        metalness: 0.2
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.01; // Slightly lower to prevent z-fighting
    ground.receiveShadow = true;

    scene.add(ground);
}

function createWalls(scene) {
    // Create outer walls - INCREASED SIZE from 50 to 150
    const wallHeight = 5;
    const wallThickness = 1;
    const mapSize = 150; // Increased map size

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777,
        roughness: 0.6,
        metalness: 0.2
    });

    // North wall
    const northWallGeometry = new THREE.BoxGeometry(mapSize + wallThickness * 2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight / 2, -mapSize / 2 - wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    northWall.userData.type = 'wall';
    scene.add(northWall);

    // Add to obstacles array
    obstacles.push({
        mesh: northWall,
        type: 'wall'
    });

    // South wall
    const southWall = northWall.clone();
    southWall.position.z = mapSize / 2 + wallThickness / 2;
    southWall.userData.type = 'wall';
    scene.add(southWall);

    // Add to obstacles array
    obstacles.push({
        mesh: southWall,
        type: 'wall'
    });

    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, mapSize);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(mapSize / 2 + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    eastWall.userData.type = 'wall';
    scene.add(eastWall);

    // Add to obstacles array
    obstacles.push({
        mesh: eastWall,
        type: 'wall'
    });

    // West wall
    const westWall = eastWall.clone();
    westWall.position.x = -mapSize / 2 - wallThickness / 2;
    westWall.userData.type = 'wall';
    scene.add(westWall);

    // Add to obstacles array
    obstacles.push({
        mesh: westWall,
        type: 'wall'
    });
}

function createObstacles(scene) {
    // Create various obstacles in the map
    const obstacleMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Brown color for crates
        roughness: 0.7,
        metalness: 0.1
    });

    // Create more crates/boxes as obstacles - ADDED MORE POSITIONS
    const cratePositions = [
        { x: 5, y: 0.5, z: 5 },
        { x: -8, y: 0.5, z: 10 },
        { x: 12, y: 0.5, z: -7 },
        { x: -15, y: 0.5, z: -12 },
        { x: 3, y: 0.5, z: -20 },
        { x: -5, y: 0.5, z: 15 },
        { x: 18, y: 0.5, z: 18 },
        { x: -20, y: 0.5, z: -18 },
        // Additional crates for larger map
        { x: 35, y: 0.5, z: 25 },
        { x: -38, y: 0.5, z: 30 },
        { x: 42, y: 0.5, z: -37 },
        { x: -45, y: 0.5, z: -42 },
        { x: 23, y: 0.5, z: -60 },
        { x: -55, y: 0.5, z: 65 },
        { x: 68, y: 0.5, z: 58 },
        { x: -70, y: 0.5, z: -68 },
        { x: 52, y: 0.5, z: 22 },
        { x: -48, y: 0.5, z: 19 },
        { x: 61, y: 0.5, z: -14 },
        { x: -75, y: 0.5, z: -29 }
    ];

    cratePositions.forEach(position => {
        // Random size for each crate
        const size = 0.8 + Math.random() * 0.4;
        const crateGeometry = new THREE.BoxGeometry(size, size, size);
        const crate = new THREE.Mesh(crateGeometry, obstacleMaterial);

        crate.position.set(position.x, position.y, position.z);
        crate.castShadow = true;
        crate.receiveShadow = true;
        crate.userData.type = 'obstacle';

        scene.add(crate);

        // Add to obstacles array
        obstacles.push({
            mesh: crate,
            type: 'obstacle'
        });
    });

    // Create more barriers - COD-style cover points
    const barrierPositions = [
        { x: 0, y: 1, z: 10, width: 10, height: 2, depth: 1 },
        { x: -15, y: 1, z: -5, width: 1, height: 2, depth: 10 },
        { x: 15, y: 1, z: 5, width: 1, height: 2, depth: 10 },
        { x: 10, y: 1, z: -10, width: 10, height: 2, depth: 1 },
        // Additional barriers for a larger map
        { x: 30, y: 1, z: 30, width: 12, height: 2, depth: 1 },
        { x: -35, y: 1, z: -25, width: 1, height: 2, depth: 12 },
        { x: 45, y: 1, z: 15, width: 1, height: 2, depth: 12 },
        { x: 20, y: 1, z: -40, width: 12, height: 2, depth: 1 },
        { x: -60, y: 1, z: 40, width: 15, height: 2, depth: 1 },
        { x: 55, y: 1, z: -55, width: 1, height: 2, depth: 15 }
    ];

    const barrierMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.5,
        metalness: 0.3
    });

    barrierPositions.forEach(position => {
        const barrierGeometry = new THREE.BoxGeometry(position.width, position.height, position.depth);
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);

        barrier.position.set(position.x, position.y, position.z);
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        barrier.userData.type = 'barrier';

        scene.add(barrier);

        // Add to obstacles array
        obstacles.push({
            mesh: barrier,
            type: 'barrier'
        });
    });

    // Create sandbag barriers (Call of Duty style)
    const sandbagPositions = [
        { x: 5, y: 0.6, z: 25, width: 8, height: 1, depth: 2 },  // Raised y position to prevent z-fighting
        { x: -25, y: 0.6, z: 5, width: 2, height: 1, depth: 8 }, // Raised y position to prevent z-fighting
        { x: 40, y: 0.6, z: -30, width: 8, height: 1, depth: 2 }, // Raised y position to prevent z-fighting
        { x: -30, y: 0.6, z: -40, width: 2, height: 1, depth: 8 } // Raised y position to prevent z-fighting
    ];

    const sandbagMaterial = new THREE.MeshStandardMaterial({
        color: 0xa08060,
        roughness: 0.9,
        metalness: 0.0
    });

    sandbagPositions.forEach(position => {
        const sandbagGeometry = new THREE.BoxGeometry(position.width, position.height, position.depth);
        const sandbag = new THREE.Mesh(sandbagGeometry, sandbagMaterial);

        sandbag.position.set(position.x, position.y, position.z);
        sandbag.castShadow = true;
        sandbag.receiveShadow = true;
        sandbag.userData.type = 'sandbag';

        scene.add(sandbag);

        // Add to obstacles array
        obstacles.push({
            mesh: sandbag,
            type: 'sandbag'
        });
    });

    // Create concrete jersey barriers (Call of Duty style)
    const jerseyBarrierPositions = [
        { x: 15, y: 1, z: 35 },
        { x: -35, y: 1, z: 15 },
        { x: 60, y: 1, z: -20 },
        { x: -20, y: 1, z: -60 }
    ];

    const jerseyBarrierMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.7,
        metalness: 0.2
    });

    jerseyBarrierPositions.forEach(position => {
        // Jersey barrier shape
        const jerseyBarrierGeometry = new THREE.BoxGeometry(1, 2, 4);
        const jerseyBarrier = new THREE.Mesh(jerseyBarrierGeometry, jerseyBarrierMaterial);

        jerseyBarrier.position.set(position.x, position.y, position.z);
        jerseyBarrier.castShadow = true;
        jerseyBarrier.receiveShadow = true;
        jerseyBarrier.userData.type = 'jerseyBarrier';

        scene.add(jerseyBarrier);

        // Add to obstacles array
        obstacles.push({
            mesh: jerseyBarrier,
            type: 'jerseyBarrier'
        });
    });

    // Add some taller structures - increased count and variety
    const towerPositions = [
        { x: -60, y: 5, z: 60 },
        { x: 60, y: 5, z: -60 },
        { x: -50, y: 8, z: -50 },
        { x: 50, y: 8, z: 50 },
        { x: 0, y: 12, z: -70 }
    ];

    const towerMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.6,
        metalness: 0.4
    });

    towerPositions.forEach(position => {
        const towerGeometry = new THREE.BoxGeometry(4, position.y * 2, 4);
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);

        tower.position.set(position.x, position.y, position.z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        tower.userData.type = 'tower';

        scene.add(tower);

        // Add to obstacles array
        obstacles.push({
            mesh: tower,
            type: 'tower'
        });
    });
}

// New function to create buildings
function createBuildings(scene) {
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999,
        roughness: 0.7,
        metalness: 0.3
    });

    // Multi-story buildings
    const buildings = [
        { x: -40, z: 40, width: 20, height: 15, depth: 20 },
        { x: 40, z: -40, width: 20, height: 12, depth: 20 },
        { x: -30, z: -70, width: 25, height: 10, depth: 15 },
        { x: 70, z: 30, width: 15, height: 12, depth: 25 }
    ];

    buildings.forEach(building => {
        const buildingGeometry = new THREE.BoxGeometry(
            building.width,
            building.height,
            building.depth
        );
        const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);

        buildingMesh.position.set(
            building.x,
            building.height / 2,
            building.z
        );

        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;
        buildingMesh.userData.type = 'building';

        scene.add(buildingMesh);

        obstacles.push({
            mesh: buildingMesh,
            type: 'building'
        });

        // Add windows to buildings
        addWindowsToBuilding(scene, building);
    });
}

// Helper function to add windows to buildings
function addWindowsToBuilding(scene, building) {
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.7
    });

    // Window size and spacing
    const windowSize = 1.5;
    const windowSpacingX = 3;
    const windowSpacingY = 3;
    const windowDepth = 0.1;

    // Calculate number of windows per side
    const numWindowsX = Math.floor(building.width / windowSpacingX) - 1;
    const numWindowsY = Math.floor(building.height / windowSpacingY) - 1;

    // Add windows on front and back sides
    for (let y = 0; y < numWindowsY; y++) {
        for (let x = 0; x < numWindowsX; x++) {
            // Front windows
            const frontWindow = new THREE.Mesh(
                new THREE.PlaneGeometry(windowSize, windowSize),
                windowMaterial
            );

            frontWindow.position.set(
                building.x - building.width / 2 + (x + 1) * windowSpacingX,
                windowSpacingY * (y + 1),
                building.z + building.depth / 2 + 0.1
            );

            frontWindow.rotation.y = Math.PI;
            scene.add(frontWindow);

            // Back windows
            const backWindow = new THREE.Mesh(
                new THREE.PlaneGeometry(windowSize, windowSize),
                windowMaterial
            );

            backWindow.position.set(
                building.x - building.width / 2 + (x + 1) * windowSpacingX,
                windowSpacingY * (y + 1),
                building.z - building.depth / 2 - 0.1
            );

            scene.add(backWindow);
        }
    }
}

// New function to create military structures like bunkers, watchtowers, etc.
function createMilitaryStructures(scene) {
    // Create bunkers
    const bunkerMaterial = new THREE.MeshStandardMaterial({
        color: 0x556b2f,  // Dark olive green
        roughness: 0.9,
        metalness: 0.2
    });

    const bunkerPositions = [
        { x: -80, z: -20, rotation: Math.PI / 4 },
        { x: 80, z: 20, rotation: -Math.PI / 4 }
    ];

    bunkerPositions.forEach(position => {
        // Main bunker body
        const bunkerGeometry = new THREE.BoxGeometry(10, 3, 8);
        const bunker = new THREE.Mesh(bunkerGeometry, bunkerMaterial);

        bunker.position.set(position.x, 1.5, position.z);
        bunker.rotation.y = position.rotation;
        bunker.castShadow = true;
        bunker.receiveShadow = true;

        scene.add(bunker);

        obstacles.push({
            mesh: bunker,
            type: 'bunker'
        });

        // Bunker roof (slightly curved)
        const roofGeometry = new THREE.CylinderGeometry(5, 5, 10, 8, 1, false, 0, Math.PI);
        const roof = new THREE.Mesh(roofGeometry, bunkerMaterial);

        roof.position.set(position.x, 4, position.z);
        roof.rotation.x = Math.PI / 2;
        roof.rotation.y = position.rotation;
        roof.castShadow = true;

        scene.add(roof);
    });

    // Create watchtowers
    const watchTowerMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,  // Saddle brown
        roughness: 0.8,
        metalness: 0.1
    });

    const towerPlatformMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969,  // Dim gray
        roughness: 0.7,
        metalness: 0.3
    });

    const watchTowerPositions = [
        { x: -90, z: 90 },
        { x: 90, z: -90 }
    ];

    watchTowerPositions.forEach(position => {
        // Tower legs
        for (let i = 0; i < 4; i++) {
            const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
            const leg = new THREE.Mesh(legGeometry, watchTowerMaterial);

            const angle = (Math.PI / 4) + (i * Math.PI / 2);
            const offsetX = 2 * Math.cos(angle);
            const offsetZ = 2 * Math.sin(angle);

            leg.position.set(position.x + offsetX, 7.5, position.z + offsetZ);
            leg.castShadow = true;

            scene.add(leg);
        }

        // Tower platform
        const platformGeometry = new THREE.BoxGeometry(6, 1, 6);
        const platform = new THREE.Mesh(platformGeometry, towerPlatformMaterial);

        platform.position.set(position.x, 15, position.z);
        platform.castShadow = true;
        platform.receiveShadow = true;

        scene.add(platform);

        obstacles.push({
            mesh: platform,
            type: 'watchTowerPlatform'
        });

        // Tower railing
        const railingMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.1
        });

        for (let i = 0; i < 4; i++) {
            const railingGeometry = new THREE.BoxGeometry(6, 2, 0.3);
            const railing = new THREE.Mesh(railingGeometry, railingMaterial);

            railing.position.set(position.x, 16.5, position.z);

            if (i % 2 === 1) {
                railing.rotation.y = Math.PI / 2;
            }

            const offset = i < 2 ? 2.85 : -2.85;

            if (i < 2) {
                railing.position.z += offset;
            } else {
                railing.position.x += offset;
            }

            railing.castShadow = true;

            scene.add(railing);
        }

        // Tower roof
        const roofGeometry = new THREE.ConeGeometry(4, 3, 4);
        const roof = new THREE.Mesh(roofGeometry, watchTowerMaterial);

        roof.position.set(position.x, 18, position.z);
        roof.castShadow = true;

        scene.add(roof);
    });
}

// New function to create urban elements like vehicles, barriers, etc.
function createUrbanElements(scene) {
    // Create destroyed vehicles (common in Call of Duty maps)
    const vehicleMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,  // Dark gray
        roughness: 0.8,
        metalness: 0.4
    });

    const vehiclePositions = [
        { x: 25, z: -15, rotation: Math.PI / 6 },
        { x: -35, z: 55, rotation: -Math.PI / 3 },
        { x: 65, z: 5, rotation: Math.PI / 2 }
    ];

    vehiclePositions.forEach(position => {
        // Vehicle body
        const bodyGeometry = new THREE.BoxGeometry(5, 2, 10);
        const body = new THREE.Mesh(bodyGeometry, vehicleMaterial);

        body.position.set(position.x, 1.02, position.z); // Slightly raised to prevent Z-fighting
        body.rotation.y = position.rotation;
        body.castShadow = true;
        body.receiveShadow = true;

        scene.add(body);

        obstacles.push({
            mesh: body,
            type: 'vehicle'
        });

        // Vehicle cabin
        const cabinGeometry = new THREE.BoxGeometry(4, 1.5, 4);
        const cabin = new THREE.Mesh(cabinGeometry, vehicleMaterial);

        cabin.position.set(
            position.x + 0.5 * Math.sin(position.rotation),
            2.77, // Adjusted to prevent Z-fighting with body
            position.z - 2 * Math.cos(position.rotation)
        );
        cabin.rotation.y = position.rotation;
        cabin.castShadow = true;

        scene.add(cabin);
    });

    // Create barrels (classic FPS prop)
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x880000,  // Dark red
        roughness: 0.7,
        metalness: 0.3
    });

    const barrelPositions = [
        { x: 15, z: 65 },
        { x: 16, z: 64 },
        { x: 14, z: 64 },
        { x: -55, z: 25 },
        { x: -54, z: 26 },
        { x: 45, z: -65 },
        { x: 44, z: -64 }
    ];

    barrelPositions.forEach(position => {
        const barrelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 12);
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);

        barrel.position.set(position.x, 1.01, position.z); // Slightly raised to prevent Z-fighting
        barrel.castShadow = true;
        barrel.receiveShadow = true;

        scene.add(barrel);

        obstacles.push({
            mesh: barrel,
            type: 'barrel'
        });
    });

    // Create concrete barriers (Call of Duty staple)
    const concreteMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.9,
        metalness: 0.1
    });

    const concreteBarrierPositions = [
        { x: 0, z: 45, rotation: 0 },
        { x: 5, z: 45, rotation: 0 },
        { x: 10, z: 45, rotation: 0 },
        { x: -45, z: 0, rotation: Math.PI / 2 },
        { x: -45, z: 5, rotation: Math.PI / 2 },
        { x: -45, z: 10, rotation: Math.PI / 2 }
    ];

    concreteBarrierPositions.forEach(position => {
        const barrierGeometry = new THREE.BoxGeometry(2, 1.2, 4);
        const barrier = new THREE.Mesh(barrierGeometry, concreteMaterial);

        barrier.position.set(position.x, 0.62, position.z); // Raised slightly to prevent Z-fighting
        barrier.rotation.y = position.rotation;
        barrier.castShadow = true;
        barrier.receiveShadow = true;

        scene.add(barrier);

        obstacles.push({
            mesh: barrier,
            type: 'concreteBarrier'
        });
    });
}

// New function to create terrain features
function createTerrainFeatures(scene) {
    // Create hills/elevated areas
    const hillMaterial = new THREE.MeshStandardMaterial({
        color: 0x556b2f,  // Dark olive green
        roughness: 0.9,
        metalness: 0.1
    });

    const hillPositions = [
        { x: -70, z: -40, radius: 20, height: 6 },
        { x: 50, z: 70, radius: 15, height: 4 }
    ];

    hillPositions.forEach(position => {
        const hillGeometry = new THREE.ConeGeometry(position.radius, position.height, 16, 1, true);
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);

        hill.position.set(position.x, position.height / 2 + 0.05, position.z); // Added small offset to prevent z-fighting
        hill.rotation.x = Math.PI;
        hill.castShadow = true;
        hill.receiveShadow = true;

        scene.add(hill);

        // Add to obstacles but with special handling in collision detection
        obstacles.push({
            mesh: hill,
            type: 'hill'
        });
    });

    // Create trench areas
    const trenchMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,  // Saddle brown
        roughness: 1.0,
        metalness: 0.0
    });

    const trenchPositions = [
        { x: 0, z: -20, width: 20, depth: 3 },
        { x: 30, z: 0, width: 3, depth: 20, rotation: Math.PI / 2 }
    ];

    trenchPositions.forEach(position => {
        const trenchGeometry = new THREE.BoxGeometry(
            position.width,
            2,
            position.depth
        );
        const trench = new THREE.Mesh(trenchGeometry, trenchMaterial);

        trench.position.set(position.x, -1.05, position.z); // Lowered slightly to prevent z-fighting
        if (position.rotation) {
            trench.rotation.y = position.rotation;
        }
        trench.receiveShadow = true;

        scene.add(trench);
    });
}

function createSky(scene) {
    // Simple sky box
    const skyGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyMaterials = [
        new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide }), // Right
        new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide }), // Left
        new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide }), // Top
        new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide }), // Bottom
        new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide }), // Front
        new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide })  // Back
    ];

    const skyBox = new THREE.Mesh(skyGeometry, skyMaterials);
    scene.add(skyBox);
} 