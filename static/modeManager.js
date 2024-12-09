import { scene, THREE } from './core.js';
import { getNodes, addNode, clearNodes } from './nodeManager.js';
import { getLines, addConnection, loadedConnections, clearConnections } from './connectionManager.js';
import { genealogyMode } from './modes/genealogyMode.js';
import { AIKnowledgeBaseMode } from './modes/AIKnowledgeBaseMode.js';
import { loadDataset } from './dataLoader.js';
import { showConnectionEditPanel } from './uiManager.js';

const plugins = {};
let currentMode = null;
const modes = {};

export function initModeManager() {
    registerMode('No Mode', { 
        name: 'No Mode', 
        activate: () => {}, 
        deactivate: () => {},
        connectionTypes: ['Default']
    });
    registerMode('Genealogy', {
        ...genealogyMode,
        connectionTypes: ['Parent-Child', 'Spouse']
    });
    registerMode('AI Knowledge Base', {
        ...AIKnowledgeBaseMode,
        connectionTypes: ['Includes', 'IsA', 'HasA', 'PartOf', 'RelatedTo', 'Implements', 'DependsOn', 'Improves', 'Contradicts', 'Uses']
    });

    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            setMode(e.target.value);
        });
    } else {
        console.warn("Mode select element not found");
    }

    // Set initial mode to 'No Mode'
    setMode('No Mode');
}

export function registerMode(name, modeImplementation) {
    modes[name] = modeImplementation;
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = modeImplementation.name || name;
        modeSelect.appendChild(option);
    }
}

export function setMode(modeName) {
    if (currentMode && currentMode.deactivate) {
        currentMode.deactivate();
    }
    currentMode = modes[modeName];
    if (currentMode) {
        if (currentMode.activate) {
            currentMode.activate();
        }
        currentMode.loadDataset = loadDataset;
        if (currentMode.initialize) {
            currentMode.initialize().then(() => {
                if (modeName !== 'No Mode') {
                    updateVisualization();
                } else {
                    clearVisualization();
                }
            }).catch(error => {
                console.error("Error initializing mode:", error);
            });
        } else {
            if (modeName !== 'No Mode') {
                updateVisualization();
            } else {
                clearVisualization();
            }
        }
    }
}

export function setModeBasedOnDataType(dataType) {
    switch(dataType) {
        case "AIKnowledgeBase":
            setMode("AI Knowledge Base");
            break;
        // Add more cases for other data types
        default:
            setMode("No Mode");
    }
}

export function getCurrentMode() {
    return currentMode;
}

export function initPluginSystem() {
    // This is where you'd load your different mode plugins
    // For now, we'll just log that it's ready
    console.log("Plugin system initialized");
}

export function updateVisualization() {
    console.log("Updating visualization for mode:", currentMode ? currentMode.name : "No mode");
    clearScene();
  
    const nodes = getNodes();
    const lines = getLines();

    let data;
    if (currentMode && currentMode.interpretData) {
        data = currentMode.interpretData({ nodes: Object.values(nodes), connections: Object.values(lines) });
    } else {
        data = { 
            nodes: Object.values(nodes), 
            connections: Object.values(lines)
        };
    }

    console.log("Data for visualization:", data);

    if (data.nodes && Array.isArray(data.nodes)) {
        data.nodes.forEach(nodeData => {
            console.log("Adding node:", nodeData);
            const node = addNode(nodeData);
            if (currentMode && currentMode.customizeNode) {
                currentMode.customizeNode(node, nodeData);
            }
        });
    }
    if (data.connections && Array.isArray(data.connections)) {
        data.connections.forEach(connData => {
            console.log("Adding connection:", connData);
            const connection = addConnection(connData);
            if (currentMode && currentMode.customizeConnection) {
                currentMode.customizeConnection(connection, connData);
            }
        });
    }

    if (currentMode && currentMode.customizeVisuals) {
        currentMode.customizeVisuals(scene, nodes, lines);
    }
}

export function clearScene() {
    const nodes = getNodes();
    const lines = getLines();
    Object.values(nodes).forEach(node => scene.remove(node));
    Object.values(lines).forEach(line => scene.remove(line));
    clearNodes();
    clearConnections();
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

function clearVisualization() {
    // Clear all nodes and connections from the scene
    clearNodes();
    clearConnections();
    // Update the scene
    updateVisualization();
}

export function handleConnectionClick(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    //if (!camera || !camera.isPerspectiveCamera) {
    //    console.error("Camera is not defined or not a PerspectiveCamera");
    //    return;
    // }

    //raycaster.setFromCamera(mouse, scene.camera);

    const lines = Object.values(getLines());
    const intersects = raycaster.intersectObjects(lines);

    if (intersects.length > 0) {
        const clickedConnection = intersects[0].object;
        showConnectionEditPanel(clickedConnection.userData);
    }
}

export { currentMode };
