let currentMode = null;
const modes = {};
const plugins = {};

export function initModeManager() {
    window.registerMode = registerMode;
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            setMode(e.target.value);
        });
    } else {
        console.warn("Mode select element not found");
    }
}

export function registerMode(name, modeImplementation) {
    modes[name] = modeImplementation;
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        modeSelect.appendChild(option);
    }
}

export function setMode(modeName) {
    if (currentMode && currentMode.deactivate) {
        currentMode.deactivate();
    }
    currentMode = modes[modeName];
    if (currentMode && currentMode.activate) {
        currentMode.activate();
    }
    updateVisualization();
}

export function initPluginSystem() {
    // This is where you'd load your different mode plugins
    // For now, we'll just log that it's ready
    console.log("Plugin system initialized");
}

export function updateVisualization() {
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

export function clearScene() {
    // Remove all nodes and lines from the scene
    Object.values(nodes).forEach(node => scene.remove(node));
    Object.values(lines).forEach(line => scene.remove(line));
    nodes = {};
    lines = {};
    loadedNodes.clear();
    loadedConnections.clear();
}

export function userAddNode(nodeData) {
    if (currentMode && currentMode.validateNodeData) {
        nodeData = currentMode.validateNodeData(nodeData);
    }
    
    addNode(nodeData);
    
    if (currentMode && currentMode.onNodeAdded) {
        currentMode.onNodeAdded(nodeData);
    }
    
    updateVisualization();
}

export function userAddConnection(connData) {
    if (currentMode && currentMode.validateConnectionData) {
        connData = currentMode.validateConnectionData(connData);
    }
    
    addConnection(connData);
    
    if (currentMode && currentMode.onConnectionAdded) {
        currentMode.onConnectionAdded(connData);
    }
    
    updateVisualization();
}

