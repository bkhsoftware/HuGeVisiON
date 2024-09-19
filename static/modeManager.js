import { scene } from './core.js';
import { getNodes, addNode, clearNodes } from './nodeManager.js';
import { getLines, addConnection, loadedConnections, clearConnections } from './connectionManager.js';
import { genealogyMode } from './modes/genealogyMode.js';
import { loadDataset } from './dataLoader.js';

const plugins = {};
let currentMode = null;
const modes = {};

export function initModeManager() {
    registerMode('No Mode', { name: 'No Mode', activate: () => {}, deactivate: () => {} });
    registerMode('Genealogy', genealogyMode);
    
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
        option.textContent = name;
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

    // Load data through the current mode's data interpreter if available
    let data;
    if (currentMode && currentMode.interpretData) {
        data = currentMode.interpretData();
    } else {
        data = { 
            nodes: Object.values(nodes), 
            connections: Object.values(lines)
        };
    }

    console.log("Data for visualization:", data);

    // Create nodes and connections based on the interpreted data
    if (data.nodes && Array.isArray(data.nodes)) {
        data.nodes.forEach(node => {
            console.log("Adding node:", node);
            addNode(node);
        });
    }
    if (data.connections && Array.isArray(data.connections)) {
        data.connections.forEach(conn => {
            console.log("Adding connection:", conn);
            addConnection(conn);
        });
    }

    // Apply mode-specific visual customizations if available
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

export { currentMode };
