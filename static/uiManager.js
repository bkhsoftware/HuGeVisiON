import { scene, camera } from './core.js';
import { nodes, addNode, pinnedNode, setPinnedNode, setShowLabels } from './nodeManager.js';
import { lines, loadedConnections, addConnection } from './connectionManager.js';
import { getColorForType, updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';
import { initDatasetManager, loadDataset, deleteCurrentDataset } from './datasetManager.js';
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
    initDatasetManager();
    initDeleteDatasetButton();
    initViewButtons();
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
    const pinButton = document.getElementById('pinButton');
    if (pinButton) {
        if (pinnedNode === node) {
            pinnedNode = null;
            pinButton.textContent = 'Pin';
            hideInfoPanelWithDelay();
        } else {
            pinnedNode = node;
            pinButton.textContent = 'Unpin';
            showNodeInfo(node);
        }
    } else {
        console.warn("Pin button element not found");
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
            try {
                const data = JSON.parse(e.target.result);
                
                // Prompt the user for a dataset name
                const defaultName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
                const datasetName = prompt("Enter a name for this dataset:", defaultName);
                
                if (datasetName === null) {
                    console.log("Dataset import cancelled by user");
                    return;
                }

                // Add the dataset name to the data object
                data.name = datasetName;
                
                // Send data to server to create a new dataset
                fetch('/api/load_data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(result => {
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    console.log('Dataset created:', result);
                    clearExistingData();
                    loadDataset(result.dataset_id);
                    fetchDatasets();  // Refresh the dataset list
                })
                .catch(error => {
                    console.error('Error creating dataset:', error);
                    alert(`Error creating dataset: ${error.message}`);
                });
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert(`Error parsing JSON: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }
}

function initDeleteDatasetButton() {
    const deleteDatasetButton = document.getElementById('deleteDatasetButton');
    deleteDatasetButton.addEventListener('click', deleteCurrentDataset);
}

function initViewButtons() {
    const controlsDiv = document.getElementById('controls');
    
    const focusRootButton = document.createElement('button');
    focusRootButton.textContent = 'Focus on Roots';
    focusRootButton.onclick = focusOnRootNodes;
    controlsDiv.appendChild(focusRootButton);

    const showAllButton = document.createElement('button');
    showAllButton.textContent = 'Show All';
    showAllButton.onclick = focusOnAllNodes;
    controlsDiv.appendChild(showAllButton);
}

function focusOnRootNodes() {
    const rootNodes = Object.values(nodes).filter(node => node.userData.parents.length === 0);
    if (rootNodes.length === 0) return;

    const box = new THREE.Box3();
    rootNodes.forEach(node => box.expandByObject(node));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= 1.5;

    camera.position.set(center.x, center.y, center.z + cameraZ);
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controls) {
        controls.target.copy(center);
        controls.update();
    }
}
