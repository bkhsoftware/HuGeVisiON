let scene, camera, renderer, nodes = {}, lines = {}, controls;
let currentPage = 1;  // Define currentPage in the global scope
const perPage = 100;
let totalPages = 1;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.z = 300;

    // Check if OrbitControls is available
    if (typeof THREE.OrbitControls === 'function') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 100;
        controls.maxDistance = 500;
        controls.maxPolarAngle = Math.PI / 2;
    } else {
        console.error('OrbitControls not loaded');
    }

    // Prevent right-click menu
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Add event listener for keyboard controls
    window.addEventListener('keydown', onKeyDown);

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light to the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    loadNodesInView();
}

function loadNodesInView() {
    const position = camera.position;
    const url = `/api/nodes?page=${currentPage}&per_page=${perPage}&x=${position.x}&y=${position.y}&z=${position.z}&radius=1000`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.nodes.length} nodes`);
            totalPages = data.total_pages;
            data.nodes.forEach(addNode);
            
            if (currentPage < totalPages) {
                currentPage++;
                loadNodesInView();
            } else {
                currentPage = 1;
                loadConnections();
            }
        })
        .catch(error => console.error('Error loading nodes:', error));
}

function loadConnections() {
    const nodeIds = Object.keys(nodes);
    const url = `/api/connections?node_ids=${nodeIds.join(',')}&page=${currentPage}&per_page=${perPage}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.connections.length} connections`);
            totalPages = data.total_pages;
            data.connections.forEach(addConnection);
            
            if (currentPage < totalPages) {
                currentPage++;
                loadConnections();
            }
        })
        .catch(error => console.error('Error loading connections:', error));
}

function onKeyDown(event) {
    const moveDistance = 10;
    switch(event.key) {
        case 'w':
        case 'ArrowUp':
            camera.position.y += moveDistance;
            break;
        case 's':
        case 'ArrowDown':
            camera.position.y -= moveDistance;
            break;
        case 'a':
        case 'ArrowLeft':
            camera.position.x -= moveDistance;
            break;
        case 'd':
        case 'ArrowRight':
            camera.position.x += moveDistance;
            break;
        case 'q':
            camera.position.z -= moveDistance;
            break;
        case 'e':
            camera.position.z += moveDistance;
            break;
    }
    loadNodesInView(); // Reload nodes after camera movement
}

function addNode(node) {
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshPhongMaterial({color: getColorForType(node.type)});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(node.x, node.y, node.z);
    scene.add(sphere);
    nodes[node.id] = sphere;
}

function addConnection(connection) {
    const startNode = nodes[connection.from_node_id];
    const endNode = nodes[connection.to_node_id];

    if (!startNode || !endNode) {
        console.warn(`Cannot add connection: node not found`, connection);
        return;
    }

    const start = startNode.position;
    const end = endNode.position;

    const points = [];
    points.push(new THREE.Vector3(start.x, start.y, start.z));
    points.push(new THREE.Vector3(end.x, end.y, end.z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: getColorForConnectionType(connection.type),
        opacity: 0.8,
        transparent: true
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    lines[connection.id] = line;
}

function getColorForType(type) {
    const colors = {
        'Person': 0x00ff00,
        'Organization': 0xff0000,
        'Place': 0x0000ff,
        'Concept': 0xffff00
    };
    return colors[type] || 0xcccccc;
}

function getColorForConnectionType(type) {
    const colors = {
        'Friend': 0x00ff00,     // Bright green
        'Colleague': 0xff00ff,  // Bright magenta
        'Family': 0x00ffff,     // Bright cyan
        'Associated': 0xffff00  // Bright yellow
    };
    return colors[type] || 0xffffff;  // Default to white if type not found
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

init();
animate();
