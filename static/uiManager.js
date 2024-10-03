import { scene, camera } from './core.js';
import { nodes, addNode, addNewNode, pinnedNode, setPinnedNode, setShowLabels } from './nodeManager.js';
import { lines, loadedConnections, addConnection, addNewConnection, updateNodeConnections } from './connectionManager.js';
import { getColorForType, updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';
import { initDatasetManager, loadDataset, deleteCurrentDataset } from './datasetManager.js';
import { MAX_CONNECTIONS, MAX_NODES, RENDER_DISTANCE, setMaxConnections, setMaxNodes, setRenderDistance } from './config.js';
import * as THREE from './lib/three.module.js';
import { clearExistingData, fetchDatasets as fetchDatasetsFromManager, deleteDatasetById } from './datasetManager.js';


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
    initDatasetManager();
    addDeleteDatasetButton(); 
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

    // Update node appearance
    node.material.color.setHex(getColorForType(newType));

    // Update node position
    node.position.set(newX, newY, newZ);

    // Update connections
    updateNodeConnections(nodeId, { x: newX, y: newY, z: newZ });

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
        if (pinnedNode && pinnedNode.userData.id === nodeId) {
            showNodeInfo(node);
        } else {
            hideInfoPanelWithDelay();
        }
        // Remove this line: updateVisibleElements();
        // Instead, just re-render the scene
        if (window.renderer && window.camera) {
            window.renderer.render(scene, window.camera);
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

async function createDeleteDatasetDialog() {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = `
        <form method="dialog">
            <h2>Delete Dataset</h2>
            <label for="deleteDatasetSelect">Select Dataset:</label>
            <select id="deleteDatasetSelect" required>
                <option value="">Loading datasets...</option>
            </select>
            <div class="button-group">
                <button type="submit" value="delete">Delete</button>
                <button type="button" value="cancel">Cancel</button>
            </div>
        </form>
    `;
    document.body.appendChild(dialog);

    const selectElement = dialog.querySelector('#deleteDatasetSelect');
    const form = dialog.querySelector('form');
    const cancelButton = dialog.querySelector('button[value="cancel"]');

    // Fetch datasets immediately when creating the dialog
    try {
        const datasets = await fetchDatasetsFromManager();
        if (datasets && datasets.length > 0) {
            selectElement.innerHTML = '<option value="">Select a dataset to delete</option>' + 
                datasets.map(dataset => 
                    `<option value="${dataset.id}">${dataset.name} (ID: ${dataset.id})</option>`
                ).join('');
        } else {
            selectElement.innerHTML = '<option value="">No datasets available</option>';
        }
    } catch (error) {
        console.error('Error fetching datasets:', error);
        selectElement.innerHTML = '<option value="">Error loading datasets</option>';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datasetId = selectElement.value;
        if (datasetId && confirm(`Are you sure you want to delete the selected dataset?`)) {
            await deleteDatasetById(datasetId);
            dialog.close();
            
            // Refresh the datasets in the dialog
            const updatedDatasets = await fetchDatasetsFromManager();
            if (updatedDatasets && updatedDatasets.length > 0) {
                selectElement.innerHTML = '<option value="">Select a dataset to delete</option>' + 
                    updatedDatasets.map(dataset => 
                        `<option value="${dataset.id}">${dataset.name} (ID: ${dataset.id})</option>`
                    ).join('');
            } else {
                selectElement.innerHTML = '<option value="">No datasets available</option>';
            }
        }
    });

    cancelButton.addEventListener('click', () => {
        dialog.close();
    });

    return dialog;
}

function addDeleteDatasetButton() {
    const controlsDiv = document.getElementById('controls');
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Dataset';
    deleteButton.onclick = async () => {
        const dialog = await createDeleteDatasetDialog();
        dialog.showModal();
    };
    
    controlsDiv.appendChild(deleteButton);
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
