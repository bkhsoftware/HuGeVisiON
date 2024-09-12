import { scene, camera } from './core.js';
import { nodes, addNode, pinnedNode, setPinnedNode, setShowLabels } from './nodeManager.js';
import { lines, loadedConnections, addConnection } from './connectionManager.js';
import { getColorForType, updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';
import { MAX_CONNECTIONS, MAX_NODES, RENDER_DISTANCE, setMaxConnections, setMaxNodes, setRenderDistance } from './config.js';
import * as THREE from './lib/three.module.js';

export let infoPanel;
let infoPanelTimeout;
let infoPanelHideTimeout;
const SHOW_DELAY = 300;
const HIDE_DELAY = 800;
let hoveredNode = null;

export function initUIManager() {
    createInfoPanel();
    initControls();
    initSaveLoadButtons();
    initLabelToggle();
    initDatasetSelector();
}

function initControls() {
    const maxConnectionsSlider = document.getElementById('maxConnections');
    const maxNodesSlider = document.getElementById('maxNodes');
    const renderDistanceSlider = document.getElementById('renderDistance');

    maxConnectionsSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        setMaxConnections(value);
        document.getElementById('maxConnectionsValue').textContent = value;
        updateVisibleElements();
    });

    maxNodesSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        setMaxNodes(value);
        document.getElementById('maxNodesValue').textContent = value;
        updateVisibleElements();
    });

    renderDistanceSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        setRenderDistance(value);
        document.getElementById('renderDistanceValue').textContent = value;
        updateVisibleElements();
    });

    // Initialize slider values
    maxConnectionsSlider.value = MAX_CONNECTIONS;
    maxNodesSlider.value = MAX_NODES;
    renderDistanceSlider.value = RENDER_DISTANCE;
    document.getElementById('maxConnectionsValue').textContent = MAX_CONNECTIONS;
    document.getElementById('maxNodesValue').textContent = MAX_NODES;
    document.getElementById('renderDistanceValue').textContent = RENDER_DISTANCE;
}

function initSaveLoadButtons() {
    const saveDataButton = document.getElementById('saveDataButton');
    const loadDataButton = document.getElementById('loadDataButton');
    const loadDataFile = document.getElementById('loadDataFile');

    saveDataButton.addEventListener('click', saveDataToFile);
    loadDataButton.addEventListener('click', () => loadDataFile.click());
    loadDataFile.addEventListener('change', loadDataFromFile);
}

function initLabelToggle() {
    const showLabelsCheckbox = document.getElementById('showLabels');
    showLabelsCheckbox.addEventListener('change', (e) => {
        setShowLabels(e.target.checked);
    });
}

function initDatasetSelector() {
    const datasetSelect = document.createElement('select');
    datasetSelect.id = 'datasetSelector';
    document.getElementById('controls').appendChild(datasetSelect);

    fetchDatasets();

    datasetSelect.addEventListener('change', (e) => {
        loadDataset(e.target.value);
    });
}

function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.style.position = 'absolute';
    infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    infoPanel.style.color = 'white';
    infoPanel.style.padding = '10px';
    infoPanel.style.borderRadius = '5px';
    infoPanel.style.display = 'none';
    infoPanel.addEventListener('mouseenter', () => {
        clearTimeout(infoPanelHideTimeout);
    });
    infoPanel.addEventListener('mouseleave', () => {
        if (!pinnedNode) {
            hideInfoPanelWithDelay();
        }
    });
    document.body.appendChild(infoPanel);
}

export function showNodeInfo(node) {
    if (!node || !node.userData) {
        console.error('Invalid node data');
        return;
    }

    const nodeData = node.userData;
    const isPinned = pinnedNode === node;

    let infoHTML = `
        <h3>${nodeData.name || 'Unnamed Node'}</h3>
        <p>Type: ${nodeData.type || 'Unspecified'}</p>
    `;

    if (typeof nodeData.x === 'number' && 
        typeof nodeData.y === 'number' && 
        typeof nodeData.z === 'number') {
        infoHTML += `
            <p>X: ${nodeData.x.toFixed(2)}</p>
            <p>Y: ${nodeData.y.toFixed(2)}</p>
            <p>Z: ${nodeData.z.toFixed(2)}</p>
        `;
    }

    infoHTML += `
        <button id="editNodeButton">Edit</button>
        <button id="pinNodeButton">${isPinned ? 'Unpin' : 'Pin'}</button>
    `;

    infoPanel.innerHTML = infoHTML;

    // Add event listeners to the buttons
    document.getElementById('editNodeButton').addEventListener('click', () => editNodeInfo(nodeData.id));
    document.getElementById('pinNodeButton').addEventListener('click', () => togglePinNode(node));

    infoPanel.style.display = 'block';
    positionInfoPanelAtNode(node);
}

export function togglePinNode(node) {
    if (pinnedNode === node) {
        setPinnedNode(null);
        document.getElementById('pinNodeButton').textContent = 'Pin';
    } else {
        setPinnedNode(node);
        document.getElementById('pinNodeButton').textContent = 'Unpin';
    }
}

export function hideNodeInfo() {
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
        <button id="saveNodeButton">Save</button>
    `;
    
    // Add event listener to the save button
    document.getElementById('saveNodeButton').addEventListener('click', () => saveNodeInfo(nodeId));
    
    positionInfoPanelAtNode(node);
}

export function saveNodeInfo(nodeId) {
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
        if (pinnedNode && pinnedNode.userData.id === nodeId) {
            showNodeInfo(node);
        } else {
            hideInfoPanelWithDelay();
        }
    })
    .catch((error) => {
        console.error('Error updating node:', error);
    });
    
    positionInfoPanelAtNode(node);
}

export function positionInfoPanelAtNode(node) {
    const vector = new THREE.Vector3();
    node.getWorldPosition(vector);
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    let x = (vector.x * widthHalf) + widthHalf;
    let y = -(vector.y * heightHalf) + heightHalf;

    // Position the panel above the node
    y -= 20; // Offset to position above the node

    // Ensure the panel stays within the window bounds
    const panelRect = infoPanel.getBoundingClientRect();
    x = Math.max(panelRect.width / 2, Math.min(x, window.innerWidth - panelRect.width / 2));
    y = Math.max(panelRect.height, Math.min(y, window.innerHeight - 20)); // 20px margin from bottom

    infoPanel.style.left = `${x}px`;
    infoPanel.style.top = `${y}px`;
    infoPanel.style.transform = 'translate(-50%, -100%)'; // Center horizontally and position above

    // Ensure the panel is fully visible
    keepPanelInView(infoPanel);
}

function keepPanelInView(panel) {
    const rect = panel.getBoundingClientRect();
    
    if (rect.left < 0) {
        panel.style.left = '0px';
        panel.style.transform = 'translate(0, -100%)';
    }
    if (rect.right > window.innerWidth) {
        panel.style.left = `${window.innerWidth - rect.width}px`;
        panel.style.transform = 'translate(0, -100%)';
    }
    if (rect.top < 0) {
        panel.style.top = '0px';
        panel.style.transform = 'translate(-50%, 0)';
    }
    if (rect.bottom > window.innerHeight) {
        panel.style.top = `${window.innerHeight - rect.height}px`;
        panel.style.transform = 'translate(-50%, 0)';
    }
}

export function showInfoPanelWithDelay(node) {
    clearTimeout(infoPanelTimeout);
    clearTimeout(infoPanelHideTimeout);
    infoPanelTimeout = setTimeout(() => {
        showNodeInfo(node);
        positionInfoPanelAtNode(node);
    }, SHOW_DELAY);
}

export function hideInfoPanelWithDelay() {
    clearTimeout(infoPanelHideTimeout);
    infoPanelHideTimeout = setTimeout(() => {
        if (!pinnedNode) {
            hideNodeInfo();
        }
    }, HIDE_DELAY);
}

function positionPanelWithinWindow(panel) {
    const rect = panel.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        panel.style.left = `${window.innerWidth - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        panel.style.top = `${window.innerHeight - rect.height}px`;
    }
    if (rect.left < 0) {
        panel.style.left = '0px';
    }
    if (rect.top < 0) {
        panel.style.top = '0px';
    }
}

function fetchDatasets() {
    fetch('/api/datasets')
        .then(response => response.json())
        .then(datasets => {
            const datasetSelect = document.getElementById('datasetSelector');
            datasetSelect.innerHTML = '<option value="">Select a dataset</option>';
            datasets.forEach(dataset => {
                const option = document.createElement('option');
                option.value = dataset.id;
                option.textContent = dataset.name;
                datasetSelect.appendChild(option);
            });
        });
}

function loadDataset(datasetId) {
    if (!datasetId) return;

    fetch(`/api/dataset/${datasetId}`)
        .then(response => response.json())
        .then(data => {
            clearExistingData();
            loadNodesFromData(data.nodes);
            loadConnectionsFromData(data.connections);
            updateVisibleElements();
            focusOnAllNodes();
        });
}

function saveData() {
    const data = {
        name: prompt("Enter a name for this dataset:"),
        nodes: Object.values(nodes).map(node => node.userData),
        connections: Object.values(lines).map(line => line.userData)
    };

    fetch('/api/dataset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Dataset saved:', result);
        fetchDatasets();  // Refresh the dataset list
    })
    .catch(error => {
        console.error('Error saving dataset:', error);
    });
}

function saveDataToFile() {
    // Collect all node and connection data, not just visible ones
    const data = {
        nodes: Object.values(nodes).map(node => node.userData),
        connections: Object.values(lines).map(line => line.userData)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'huge_vision_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadDataFromFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            clearExistingData();
            loadNodesFromData(data.nodes);
            loadConnectionsFromData(data.connections);
            updateVisibleElements();
            focusOnAllNodes(); // Add this line
        };
        reader.readAsText(file);
    }
}

function clearExistingData() {
    // Clear nodes
    Object.values(nodes).forEach(node => {
        scene.remove(node);
    });
    Object.keys(nodes).forEach(key => delete nodes[key]);

    // Clear connections
    Object.values(lines).forEach(line => {
        scene.remove(line);
    });
    Object.keys(lines).forEach(key => delete lines[key]);
    loadedConnections.clear();

    // Reset any pinned or hovered nodes
    setPinnedNode(null);
    hoveredNode = null;

    // Clear info panel
    hideNodeInfo();
}

function loadNodesFromData(nodesData) {
    nodesData.forEach(nodeData => {
        addNode(nodeData, false); // Add node without adding to scene
    });
}

function loadConnectionsFromData(connectionsData) {
    connectionsData.forEach(connectionData => {
        addConnection(connectionData, false); // Add connection without adding to scene
    });
}

