// Make sure Three.js and OrbitControls are loaded
if (typeof THREE === 'undefined') {
    console.error('Three.js is not loaded. Please check your script inclusions.');
}

let scene, camera, renderer, nodes = {}, lines = {}, controls;
let currentPage = 1;  // Define currentPage in the global scope
const perPage = 100;
let totalPages = 1;
let loadedNodes = new Set();
let loadedConnections = new Set();

let nodeCache = {};
let connectionCache = {};
let lastFetchTime = 0;
const FETCH_COOLDOWN = 5000; // 5 seconds cooldown between fetches

let MAX_CONNECTIONS = 1000;
let MAX_NODES = 1000;
let RENDER_DISTANCE = 1000;

let raycaster, mouse;
let hoveredNode = null;
let infoPanel;

// Mode system
let currentMode = null;
const modes = {};

// Plugin system
const plugins = {};

window.registerMode = registerMode;

function registerMode(name, modeImplementation) {
    modes[name] = modeImplementation;
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        modeSelect.appendChild(option);
    }
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    camera.position.z = 300;

    // Initialize OrbitControls
    initOrbitControls();

    // Test OrbitControls
    if (controls) {
        console.log('Testing OrbitControls...');
        controls.target.set(0, 0, 0);
        controls.update();
        console.log('OrbitControls test complete');
    }

    createInfoPanel();

    // Prevent right-click menu
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Add event listener for keyboard controls
    window.addEventListener('keydown', onKeyDown);

    renderer.domElement.addEventListener('mousemove', onMouseMove, false);

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light to the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    initControls();
    loadNodesInView();

    animate();

}

function initOrbitControls() {
    console.log('Initializing OrbitControls...');
    console.log('THREE.OrbitControls availability:', typeof THREE.OrbitControls);

    if (typeof THREE.OrbitControls === 'function') {
        try {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.screenSpacePanning = false;
            controls.minDistance = 10;
            controls.maxDistance = 1000;
            controls.maxPolarAngle = Math.PI;
            controls.keyPanSpeed = 0; // Disable default key controls
            console.log('OrbitControls initialized successfully:', controls);
        } catch (error) {
            console.error('Error initializing OrbitControls:', error);
        }
    } else {
        console.error('THREE.OrbitControls is not a function. Make sure it\'s loaded correctly.');
    }
}

function initControls() {
    const maxConnectionsSlider = document.getElementById('maxConnections');
    const maxNodesSlider = document.getElementById('maxNodes');
    const renderDistanceSlider = document.getElementById('renderDistance');

    maxConnectionsSlider.addEventListener('input', (e) => {
        MAX_CONNECTIONS = parseInt(e.target.value);
        document.getElementById('maxConnectionsValue').textContent = MAX_CONNECTIONS;
        updateVisibleElements();
    });

    maxNodesSlider.addEventListener('input', (e) => {
        MAX_NODES = parseInt(e.target.value);
        document.getElementById('maxNodesValue').textContent = MAX_NODES;
        updateVisibleElements();
    });

    renderDistanceSlider.addEventListener('input', (e) => {
        RENDER_DISTANCE = parseInt(e.target.value);
        document.getElementById('renderDistanceValue').textContent = RENDER_DISTANCE;
        updateVisibleElements();
    });
}

function initPluginSystem() {
    // This is where you'd load your different mode plugins
    // For now, we'll just log that it's ready
    console.log("Plugin system initialized");
}

function initModeSystem() {
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            setMode(e.target.value);
        });
    } else {
        console.warn("Mode select element not found");
    }
}

function registerMode(name, modeImplementation) {
    modes[name] = modeImplementation;
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        modeSelect.appendChild(option);
    }
}

function setMode(modeName) {
    if (currentMode && currentMode.deactivate) {
        currentMode.deactivate();
    }
    currentMode = modes[modeName];
    if (currentMode && currentMode.activate) {
        currentMode.activate();
    }
    updateVisualization();
}

function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.style.position = 'absolute';
    infoPanel.style.top = '10px';
    infoPanel.style.right = '10px';
    infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    infoPanel.style.color = 'white';
    infoPanel.style.padding = '10px';
    infoPanel.style.borderRadius = '5px';
    infoPanel.style.display = 'none';
    document.body.appendChild(infoPanel);
}

function onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function checkNodeHover() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0 && intersects[0].object.type === 'Mesh') {
        const closestNode = intersects[0].object;
        if (closestNode !== hoveredNode) {
            hoveredNode = closestNode;
            showNodeInfo(hoveredNode);
        }
    } else if (hoveredNode) {
        hoveredNode = null;
        hideNodeInfo();
    }
}

function showNodeInfo(node) {
    if (!node || !node.userData) {
        console.error('Invalid node data');
        return;
    }

    const nodeData = node.userData;
    
    let infoHTML = `
        <h3>${nodeData.name || 'Unnamed Node'}</h3>
        <p>Type: ${nodeData.type || 'Unspecified'}</p>
    `;

    // Only add position information if it exists
    if (typeof nodeData.x === 'number' && 
        typeof nodeData.y === 'number' && 
        typeof nodeData.z === 'number') {
        infoHTML += `
            <p>X: ${nodeData.x.toFixed(2)}</p>
            <p>Y: ${nodeData.y.toFixed(2)}</p>
            <p>Z: ${nodeData.z.toFixed(2)}</p>
        `;
    }

    infoHTML += `<button onclick="editNodeInfo(${nodeData.id})">Edit</button>`;

    infoPanel.innerHTML = infoHTML;
    infoPanel.style.display = 'block';
}

function hideNodeInfo() {
    infoPanel.style.display = 'none';
}

function editNodeInfo(nodeId) {
    const node = nodes[nodeId];
    const nodeData = node.userData;
    infoPanel.innerHTML = `
        <h3>Edit Node</h3>
        <input id="nodeName" value="${nodeData.name}">
        <select id="nodeType">
            <option value="Person" ${nodeData.type === 'Person' ? 'selected' : ''}>Person</option>
            <option value="Organization" ${nodeData.type === 'Organization' ? 'selected' : ''}>Organization</option>
            <option value="Place" ${nodeData.type === 'Place' ? 'selected' : ''}>Place</option>
            <option value="Concept" ${nodeData.type === 'Concept' ? 'selected' : ''}>Concept</option>
        </select>
        <button onclick="saveNodeInfo(${nodeId})">Save</button>
    `;
}

function saveNodeInfo(nodeId) {
    const node = nodes[nodeId];
    const newName = document.getElementById('nodeName').value;
    const newType = document.getElementById('nodeType').value;

    // Update node data
    node.userData.name = newName;
    node.userData.type = newType;

    // Update node appearance
    node.material.color.setHex(getColorForType(newType));

    // Send update to server
    fetch('/api/update_node', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: nodeId,
            name: newName,
            type: newType,
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Node updated successfully:', data);
        showNodeInfo(node);
    })
    .catch((error) => {
        console.error('Error updating node:', error);
    });
}

function loadNodesInView() {
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
        return; // Don't fetch if we've fetched recently
    }
    lastFetchTime = now;

    const position = camera.position;
    const url = `/api/nodes?page=${currentPage}&per_page=${perPage}&x=${position.x}&y=${position.y}&z=${position.z}&radius=${RENDER_DISTANCE}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.nodes.length} nodes`);
            totalPages = data.total_pages;
            data.nodes.forEach(node => {
                if (!nodeCache[node.id]) {
                    nodeCache[node.id] = node;
                    addNode(node);
                }
            });

            if (currentPage < totalPages && Object.keys(nodes).length < MAX_NODES) {
                currentPage++;
                loadNodesInView();
            } else {
                currentPage = 1;
                loadConnections();
            }
            updateVisibleElements();
        })
        .catch(error => console.error('Error loading nodes:', error));
}

function loadConnections() {
    const nodeIds = Object.keys(nodes).filter(id => id !== 'undefined');
    if (nodeIds.length === 0) {
        console.log("No valid node IDs to load connections for.");
        return;
    }
    const url = `/api/connections?node_ids=${nodeIds.join(',')}&page=${currentPage}&per_page=${perPage}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.connections.length} connections`);
            data.connections.forEach(connection => {
                if (!connectionCache[connection.id]) {
                    connectionCache[connection.id] = connection;
                    if (nodes[connection.from_node_id] && nodes[connection.to_node_id]) {
                        addConnection(connection);
                    }
                }
            });

            if (currentPage < data.total_pages && loadedConnections.size < MAX_CONNECTIONS) {
                currentPage++;
                loadConnections();
            } else {
                console.log(`Reached maximum connections (${loadedConnections.size}) or all pages loaded.`);
            }
            updateVisibleElements();
        })
        .catch(error => console.error('Error loading connections:', error));
}

function updateVisibleElements() {
    const position = camera.position;
    
    // Update node visibility
    Object.values(nodes).forEach(node => {
        if (node && node.position) {
            const distance = node.position.distanceTo(position);
            node.visible = distance <= RENDER_DISTANCE;
        }
    });
    
    // Update connection visibility
    Object.values(lines).forEach(line => {
        if (line && line.userData) {
            const startNode = nodes[line.userData.from_node_id];
            const endNode = nodes[line.userData.to_node_id];
            line.visible = startNode && endNode && startNode.visible && endNode.visible;
        }
    });
}

function updateVisualization() {
    // Clear existing nodes and connections
    clearScene();

    // Load data through the current mode's data interpreter if available
    let data;
    if (currentMode && currentMode.interpretData) {
        data = currentMode.interpretData(rawData);
    } else {
        data = { nodes: Object.values(nodes), connections: Object.values(lines) };
    }

    // Create nodes and connections based on the interpreted data
    data.nodes.forEach(node => addNode(node));
    data.connections.forEach(conn => addConnection(conn));

    // Apply mode-specific visual customizations if available
    if (currentMode && currentMode.customizeVisuals) {
        currentMode.customizeVisuals(scene, nodes, lines);
    }
}

function clearScene() {
    // Remove all nodes and lines from the scene
    Object.values(nodes).forEach(node => scene.remove(node));
    Object.values(lines).forEach(line => scene.remove(line));
    nodes = {};
    lines = {};
    loadedNodes.clear();
    loadedConnections.clear();
}

function updateCamera() {
    controls.update();
    onCameraMove();
}

let cameraMovePending = false;
function onCameraMove() {
    if (!cameraMovePending) {
        cameraMovePending = true;
        setTimeout(() => {
            updateVisibleElements();
            // Only load new nodes if we're close to the edge of our loaded area
            if (Object.keys(nodes).length < MAX_NODES) {
                loadNodesInView();
            }
            cameraMovePending = false;
        }, 200); // 200ms debounce
    }
}

function onMouseClick(event) {
    // Raycast to find clicked objects
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (currentMode && currentMode.handleClick) {
            currentMode.handleClick(object);
        }
    }
}

function onKeyDown(event) {
    const moveSpeed = 5;
    const vector = new THREE.Vector3();

    switch(event.key) {
        case 'w':
        case 'ArrowUp':
            vector.z = -moveSpeed;
            break;
        case 's':
        case 'ArrowDown':
            vector.z = moveSpeed;
            break;
        case 'a':
        case 'ArrowLeft':
            vector.x = -moveSpeed;
            break;
        case 'd':
        case 'ArrowRight':
            vector.x = moveSpeed;
            break;
        case 'q':
            vector.y = moveSpeed;
            break;
        case 'e':
            vector.y = -moveSpeed;
            break;
    }

    // Apply the movement in the camera's local space
    vector.applyQuaternion(camera.quaternion);
    camera.position.add(vector);

    controls.target.add(vector);
    controls.update();

    onCameraMove();
    //loadNodesInView(); // Reload nodes after camera movement
}


function addNode(node) {
    if (Object.keys(nodes).length >= MAX_NODES) {
        return;
    }
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshPhongMaterial({color: getColorForType(node.type)});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(node.x, node.y, node.z);
    
    // Set the entire node object as userData
    sphere.userData = node;
    
    scene.add(sphere);
    nodes[node.id] = sphere;
}

function addConnection(connection) {
    if (loadedConnections.size >= MAX_CONNECTIONS) {
        return;
    }

    const startNode = nodes[connection.from_node_id];
    const endNode = nodes[connection.to_node_id];

    if (!startNode || !endNode) {
        return;  // Silently skip connections with missing nodes
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
    line.userData = connection;
    scene.add(line);
    lines[connection.id] = line;
    loadedConnections.add(connection.id);
}


function userAddNode(nodeData) {
    if (currentMode && currentMode.validateNodeData) {
        nodeData = currentMode.validateNodeData(nodeData);
    }
    
    addNode(nodeData);
    
    if (currentMode && currentMode.onNodeAdded) {
        currentMode.onNodeAdded(nodeData);
    }
    
    updateVisualization();
}

function userAddConnection(connData) {
    if (currentMode && currentMode.validateConnectionData) {
        connData = currentMode.validateConnectionData(connData);
    }
    
    addConnection(connData);
    
    if (currentMode && currentMode.onConnectionAdded) {
        currentMode.onConnectionAdded(connData);
    }
    
    updateVisualization();
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
    updateCamera();
    checkNodeHover();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function cleanupCache() {
    const now = Date.now();
    Object.keys(nodeCache).forEach(id => {
        if (now - nodeCache[id].lastAccessed > 300000) { // 5 minutes
            delete nodeCache[id];
        }
    });
    Object.keys(connectionCache).forEach(id => {
        if (now - connectionCache[id].lastAccessed > 300000) { // 5 minutes
            delete connectionCache[id];
        }
    });
}

window.addEventListener('resize', onWindowResize);

// Initialize the visualization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing visualization...');
    init();
});

// Call cleanupCache every 5 minutes
setInterval(cleanupCache, 300000);

// Add this line at the end of the file
console.log('visualization.js loaded');
