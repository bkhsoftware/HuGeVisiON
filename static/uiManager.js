import { scene, camera, refreshScene } from './core.js';
import { nodes, addNode, addNewNode, pinnedNode, setPinnedNode, setShowLabels } from './nodeManager.js';
import { lines, loadedConnections, addConnection, addNewConnection, updateNodeConnections, updateConnection, deleteConnection, toggleConnectionLabels } from './connectionManager.js';
import { getColorForType, updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';
import { MAX_CONNECTIONS, MAX_NODES, RENDER_DISTANCE, setMaxConnections, setMaxNodes, setRenderDistance } from './config.js';
import * as THREE from './lib/three.module.js';
import { clearExistingData, fetchDatasets as fetchDatasetsFromManager, loadDataset } from './datasetManager.js';
import { getCurrentMode } from './modeManager.js';


export let infoPanel;
let infoPanelTimeout;
let infoPanelHideTimeout;
const SHOW_DELAY = 300;
const HIDE_DELAY = 800;
let hoveredNode = null;
let isConnectionMode = false;
let firstSelectedNode = null;

export function initUIManager() {
    createInfoPanel();
    initControls();
    initSaveLoadButtons();
    initLabelToggle();
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

    const buttonRow = document.createElement('div');
    buttonRow.style.marginTop = '10px';
    document.getElementById('controls').appendChild(buttonRow);

    const addNodeButton = document.createElement('button');
    addNodeButton.textContent = 'Add Node';
    addNodeButton.addEventListener('click', () => {
        const x = Math.random() * 100 - 50;
        const y = Math.random() * 100 - 50;
        const z = Math.random() * 100 - 50;
        const newNode = addNewNode(x, y, z);
        showNodeInfo(newNode);
    });
    buttonRow.appendChild(addNodeButton);

    const addConnectionButton = document.createElement('button');
    addConnectionButton.textContent = 'Create Connection';
    addConnectionButton.dataset.action = 'create-connection';  // Add this line
    addConnectionButton.addEventListener('click', toggleConnectionMode);
    buttonRow.appendChild(addConnectionButton);

    const focusRootButton = document.createElement('button');
    focusRootButton.textContent = 'Focus on Roots';
    focusRootButton.onclick = focusOnRootNodes;
    buttonRow.appendChild(focusRootButton);

    const showAllButton = document.createElement('button');
    showAllButton.textContent = 'Show All';
    showAllButton.onclick = focusOnAllNodes;
    buttonRow.appendChild(showAllButton);

    const toggleLabelsButton = document.createElement('button');
    toggleLabelsButton.textContent = 'Toggle Connection Labels';
    toggleLabelsButton.onclick = toggleConnectionLabels;
    buttonRow.appendChild(toggleLabelsButton);
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
    const pinButton = document.getElementById('pinNodeButton');
    if (pinButton) {
        if (pinnedNode === node) {
            setPinnedNode(null);
            pinButton.textContent = 'Pin';
            hideInfoPanelWithDelay();
        } else {
            setPinnedNode(node);
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
        <label for="nodeName">Name:</label>
        <input id="nodeName" value="${nodeData.name}">
        <label for="nodeType">Type:</label>
        <select id="nodeType">
            <option value="Person" ${nodeData.type === 'Person' ? 'selected' : ''}>Person</option>
            <option value="Organization" ${nodeData.type === 'Organization' ? 'selected' : ''}>Organization</option>
            <option value="Place" ${nodeData.type === 'Place' ? 'selected' : ''}>Place</option>
            <option value="Concept" ${nodeData.type === 'Concept' ? 'selected' : ''}>Concept</option>
        </select>
        <label for="nodeX">X:</label>
        <input type="number" id="nodeX" value="${nodeData.x.toFixed(2)}">
        <label for="nodeY">Y:</label>
        <input type="number" id="nodeY" value="${nodeData.y.toFixed(2)}">
        <label for="nodeZ">Z:</label>
        <input type="number" id="nodeZ" value="${nodeData.z.toFixed(2)}">
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
    const newX = parseFloat(document.getElementById('nodeX').value);
    const newY = parseFloat(document.getElementById('nodeY').value);
    const newZ = parseFloat(document.getElementById('nodeZ').value);

    // Update node data
    node.userData.name = newName;
    node.userData.type = newType;
    node.userData.x = newX;
    node.userData.y = newY;
    node.userData.z = newZ;

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
            x: newX,
            y: newY,
            z: newZ,
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Node updated successfully:', data);
        
        // Refresh the scene
        refreshScene(data.dataset_id);

        if (pinnedNode && pinnedNode.userData.id === nodeId) {
            showNodeInfo(nodes[nodeId]);  // Use the new node object after refresh
        } else {
            hideInfoPanelWithDelay();
        }
    })
    .catch((error) => {
        console.error('Error updating node:', error);
    });
}

function positionInfoPanelAtObject(object) {
    const vector = new THREE.Vector3();
    
    if (object.type === 'Line') {
        // For connections, use the midpoint
        const start = new THREE.Vector3(object.geometry.attributes.position.array[0], 
                                        object.geometry.attributes.position.array[1], 
                                        object.geometry.attributes.position.array[2]);
        const end = new THREE.Vector3(object.geometry.attributes.position.array[3], 
                                      object.geometry.attributes.position.array[4], 
                                      object.geometry.attributes.position.array[5]);
        vector.addVectors(start, end).multiplyScalar(0.5);
    } else {
        // For nodes, use the node's position
        object.getWorldPosition(vector);
    }
    
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    let x = (vector.x * widthHalf) + widthHalf;
    let y = -(vector.y * heightHalf) + heightHalf;

    // Position the panel above the object
    y -= 20;

    // Ensure the panel stays within the window bounds
    const panelRect = infoPanel.getBoundingClientRect();
    x = Math.max(panelRect.width / 2, Math.min(x, window.innerWidth - panelRect.width / 2));
    y = Math.max(panelRect.height, Math.min(y, window.innerHeight - 20));

    infoPanel.style.left = `${x}px`;
    infoPanel.style.top = `${y}px`;
    infoPanel.style.transform = 'translate(-50%, -100%)';

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

export function showInfoPanelWithDelay(object) {
    clearTimeout(infoPanelTimeout);
    clearTimeout(infoPanelHideTimeout);
    infoPanelTimeout = setTimeout(() => {
        if (object.type === 'Line') {
            showConnectionInfo(object);
        } else {
            showNodeInfo(object);
        }
        positionInfoPanelAtObject(object);
    }, SHOW_DELAY);
}

function showConnectionInfo(connection) {
    const connectionData = connection.userData;
    
    let infoHTML = `
        <h3>${connectionData.name || 'Unnamed Connection'}</h3>
        <p>Type: ${connectionData.type || 'Unspecified'}</p>
        <p>From: ${connectionData.from_node_id}</p>
        <p>To: ${connectionData.to_node_id}</p>
        <button id="editConnectionButton">Edit</button>
    `;

    infoPanel.innerHTML = infoHTML;

    document.getElementById('editConnectionButton').addEventListener('click', () => showConnectionEditPanel(connectionData));

    infoPanel.style.display = 'block';
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

async function loadDataFromFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let data = JSON.parse(e.target.result);
                
                // Prompt the user for a dataset name
                const defaultName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
                const datasetName = prompt("Enter a name for this dataset:", defaultName);
                
                if (datasetName === null) {
                    console.log("Dataset import cancelled by user");
                    return;
                }

                // Add the dataset name to the data object
                data.name = datasetName;

                // Fetch existing connection IDs
                let existingIds = [];
                try {
                    const existingIdsResponse = await fetch('/api/connection_ids');
                    if (!existingIdsResponse.ok) {
                        throw new Error(`Failed to fetch existing connection IDs: ${existingIdsResponse.statusText}`);
                    }
                    existingIds = await existingIdsResponse.json();
                } catch (error) {
                    console.warn("Failed to fetch existing connection IDs. Proceeding with import anyway.", error);
                }

                // Generate new unique IDs for connections
                if (data.connections) {
                    let maxId = Math.max(...existingIds, ...data.connections.map(c => parseInt(c.id) || 0), 0);
                    data.connections = data.connections.map(connection => ({
                        ...connection,
                        id: ++maxId
                    }));
                }
                
                // Send data to server to create a new dataset
                const response = await fetch('/api/load_data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('Dataset created:', result);
                await clearExistingData();
                await loadDataset(result.dataset_id);
                const updatedDatasets = await fetchDatasetsFromManager();  // Refresh the dataset list
                
                // Update the dataset selector
                const datasetSelector = document.getElementById('datasetSelector');
                if (datasetSelector) {
                    datasetSelector.innerHTML = '<option value="">Select a dataset</option>';
                    updatedDatasets.forEach(dataset => {
                        const option = document.createElement('option');
                        option.value = dataset.id;
                        option.textContent = dataset.name;
                        datasetSelector.appendChild(option);
                    });
                    datasetSelector.value = result.dataset_id;
                }

                alert(`Dataset "${datasetName}" has been successfully created and loaded.`);
            } catch (error) {
                console.error('Error creating dataset:', error);
                alert(`Error creating dataset: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }
}

function focusOnRootNodes() {
    const rootNodes = Object.values(nodes).filter(node => {
        return node && node.userData && Array.isArray(node.userData.parents) && node.userData.parents.length === 0;
    });

    if (rootNodes.length === 0) {
        console.log("No root nodes found.");
        return;
    }

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

function toggleConnectionMode() {
    isConnectionMode = !isConnectionMode;
    const addConnectionButton = document.querySelector('button[data-action="create-connection"]');
    if (isConnectionMode) {
        addConnectionButton.textContent = 'Cancel Connection';
        addConnectionButton.style.backgroundColor = 'red';
        document.body.style.cursor = 'crosshair';
    } else {
        addConnectionButton.textContent = 'Create Connection';
        addConnectionButton.style.backgroundColor = '';
        document.body.style.cursor = 'default';
        firstSelectedNode = null;
    }
}

export function handleNodeClick(node) {
    if (isConnectionMode) {
        if (!firstSelectedNode) {
            firstSelectedNode = node;
            node.material.emissive.setHex(0xff0000); // Highlight first selected node
        } else if (node !== firstSelectedNode) {
            addNewConnection(firstSelectedNode.userData.id, node.userData.id);
            firstSelectedNode.material.emissive.setHex(0x000000); // Remove highlight
            firstSelectedNode = null;
            toggleConnectionMode(); // Exit connection mode
        }
    } else {
        showNodeInfo(node);
    }
}

async function fetchDatasets() {
    try {
        const datasets = await fetchDatasetsFromManager();
        return datasets;
    } catch (error) {
        console.error('Error fetching datasets:', error);
        throw error;
    }
}

export function showConnectionEditPanel(connectionData) {
    const currentMode = getCurrentMode();
    const panel = document.createElement('div');
    panel.id = 'connectionEditPanel';
    panel.style.position = 'absolute';
    panel.style.right = '10px';
    panel.style.top = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';

    let typeOptions = ['Default'];
    if (currentMode && currentMode.connectionTypes) {
        typeOptions = currentMode.connectionTypes;
    }

    panel.innerHTML = `
        <h3>Edit Connection</h3>
        <label for="connectionName">Name:</label>
        <input type="text" id="connectionName" value="${connectionData.name || ''}"><br>
        <label for="connectionType">Type:</label>
        <select id="connectionType">
            ${typeOptions.map(type => `<option value="${type}" ${connectionData.type === type ? 'selected' : ''}>${type}</option>`).join('')}
        </select><br>
        <button id="saveConnectionBtn">Save</button>
        <button id="deleteConnectionBtn">Delete</button>
        <button id="closeEditPanelBtn">Close</button>
    `;

    document.body.appendChild(panel);

    document.getElementById('saveConnectionBtn').addEventListener('click', () => {
        const name = document.getElementById('connectionName').value;
        const type = document.getElementById('connectionType').value;
        updateConnection(connectionData.id, { name, type });
        panel.remove();
    });

    document.getElementById('deleteConnectionBtn').addEventListener('click', () => {
        deleteConnection(connectionData.id);
        panel.remove();
    });

    document.getElementById('closeEditPanelBtn').addEventListener('click', () => {
        panel.remove();
    });
}
