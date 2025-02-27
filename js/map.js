export function createMap(scene) {
    // Create ground
    createGround(scene);

    // Create walls
    createWalls(scene);

    // Create obstacles
    createObstacles(scene);

    // Create sky
    createSky(scene);
}

function createGround(scene) {
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.8,
        metalness: 0.2
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = 0;
    ground.receiveShadow = true;

    scene.add(ground);
}

function createWalls(scene) {
    // Create outer walls
    const wallHeight = 5;
    const wallThickness = 1;
    const mapSize = 50;

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
    scene.add(northWall);

    // South wall
    const southWall = northWall.clone();
    southWall.position.z = mapSize / 2 + wallThickness / 2;
    scene.add(southWall);

    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, mapSize);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(mapSize / 2 + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    scene.add(eastWall);

    // West wall
    const westWall = eastWall.clone();
    westWall.position.x = -mapSize / 2 - wallThickness / 2;
    scene.add(westWall);
}

function createObstacles(scene) {
    // Create various obstacles in the map
    const obstacleMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Brown color for crates
        roughness: 0.7,
        metalness: 0.1
    });

    // Create crates/boxes as obstacles
    const cratePositions = [
        { x: 5, y: 0.5, z: 5 },
        { x: -8, y: 0.5, z: 10 },
        { x: 12, y: 0.5, z: -7 },
        { x: -15, y: 0.5, z: -12 },
        { x: 3, y: 0.5, z: -20 },
        { x: -5, y: 0.5, z: 15 },
        { x: 18, y: 0.5, z: 18 },
        { x: -20, y: 0.5, z: -18 }
    ];

    cratePositions.forEach(position => {
        // Random size for each crate
        const size = 0.8 + Math.random() * 0.4;
        const crateGeometry = new THREE.BoxGeometry(size, size, size);
        const crate = new THREE.Mesh(crateGeometry, obstacleMaterial);

        crate.position.set(position.x, position.y, position.z);
        crate.castShadow = true;
        crate.receiveShadow = true;

        scene.add(crate);
    });

    // Create some barriers
    const barrierPositions = [
        { x: 0, y: 1, z: 10, width: 10, height: 2, depth: 1 },
        { x: -15, y: 1, z: -5, width: 1, height: 2, depth: 10 },
        { x: 15, y: 1, z: 5, width: 1, height: 2, depth: 10 },
        { x: 10, y: 1, z: -10, width: 10, height: 2, depth: 1 }
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

        scene.add(barrier);
    });

    // Add some taller structures
    const towerPositions = [
        { x: -20, y: 5, z: 20 },
        { x: 20, y: 5, z: -20 }
    ];

    const towerMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.6,
        metalness: 0.4
    });

    towerPositions.forEach(position => {
        const towerGeometry = new THREE.BoxGeometry(4, 10, 4);
        const tower = new THREE.Mesh(towerGeometry, towerMaterial);

        tower.position.set(position.x, position.y, position.z);
        tower.castShadow = true;
        tower.receiveShadow = true;

        scene.add(tower);
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