import { scene, initializeSceneLights } from './core.js';
import { nodes, addNode, setPinnedNode } from './nodeManager.js';
import { lines, loadedConnections, addConnection } from './connectionManager.js';
import { updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';
import { getCurrentMode } from './modeManager.js';

let currentDatasetId = null;

export function initDatasetManager() {
    const datasetSelector = document.getElementById('datasetSelector');
    if (datasetSelector) {
        datasetSelector.addEventListener('change', handleDatasetChange);
        fetchDatasets();

        // Add the new delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Dataset';
        deleteButton.onclick = handleDeleteDatasetClick;
        
        // Insert the delete button before the dataset selector
        datasetSelector.parentNode.insertBefore(deleteButton, datasetSelector);
    } else {
        console.warn("Dataset selector element not found");
    }
}

function handleDatasetChange(event) {
    const datasetId = event.target.value;
    if (datasetId) {
        loadDataset(datasetId);
    } else {
        clearExistingData();
    }
}

export function loadDataset(datasetId) {
    if (!datasetId) return;

    currentDatasetId = datasetId;

    fetch(`/api/dataset/${datasetId}`)
        .then(response => response.json())
        .then(data => {
            clearExistingData();
            console.log("Raw data from server:", data);

            // Use the genealogy mode to interpret the data
            const currentMode = getCurrentMode();
            if (currentMode && currentMode.name === 'Genealogy') {
                console.log("Using current mode to interpret data");
                const interpretedData = currentMode.interpretData(data);
                console.log("Interpreted data:", interpretedData);
                loadNodesFromData(interpretedData.nodes);
                loadConnectionsFromData(interpretedData.connections);
            } else {
                console.warn("Appropriate mode not found or not active, using raw data");
                loadNodesFromData(data.nodes);
                loadConnectionsFromData(data.connections);
            }

            updateVisibleElements();
            focusOnAllNodes();
            
            // Set the selected dataset in the dropdown
            const datasetSelector = document.getElementById('datasetSelector');
            if (datasetSelector) {
                datasetSelector.value = datasetId;
            }
        })
        .catch(error => console.error('Error loading dataset:', error));
}

export async function fetchDatasets() {
    try {
        const response = await fetch('/api/datasets');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const datasets = await response.json();
        
        const datasetSelector = document.getElementById('datasetSelector');
        if (datasetSelector) {
            datasetSelector.innerHTML = '<option value="">Select a dataset</option>';
            if (Array.isArray(datasets) && datasets.length > 0) {
                datasets.forEach(dataset => {
                    const option = document.createElement('option');
                    option.value = dataset.id;
                    option.textContent = dataset.name;
                    datasetSelector.appendChild(option);
                });
            } else {
                console.log("No datasets available");
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = "No datasets available";
                datasetSelector.appendChild(option);
            }
        }
        
        return datasets;  // Return the datasets array
    } catch (error) {
        console.error('Error fetching datasets:', error);
        throw error;
    }
}

export async function clearExistingData() {
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

    // Force a render to clear any remaining visuals
    if (window.renderer && window.camera) {
        window.renderer.render(scene, window.camera);
    }

    // Dispose of geometries and materials
    scene.traverse((object) => {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
    });

    // Clear the scene
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }

    // Re-add essential scene elements (like lights)
    initializeSceneLights();
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

export function deleteDatasetById(datasetId) {
    fetch(`/api/dataset/${datasetId}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Dataset deleted:', data);
        
        // Remove the dataset from the selector
        const datasetSelector = document.getElementById('datasetSelector');
        if (datasetSelector) {
            const option = datasetSelector.querySelector(`option[value="${datasetId}"]`);
            if (option) {
                option.remove();
            }
            // Reset the selector to "Select a dataset"
            datasetSelector.value = "";
        }

        // Clear the visualization if the deleted dataset was the current one
        if (currentDatasetId === datasetId) {
            clearExistingData();
            currentDatasetId = null;
        }

        // Refresh the dataset list
        fetchDatasets();

        alert(`Dataset ${datasetId} has been deleted successfully.`);
    })
    .catch(error => {
        console.error('Error deleting dataset:', error);
        alert(`Error deleting dataset: ${error.message}`);
    });
}

async function handleDeleteDatasetClick() {
    const datasetSelector = document.getElementById('datasetSelector');
    const currentDatasetId = datasetSelector.value;

    if (currentDatasetId) {
        // A dataset is currently selected, delete it directly
        if (confirm(`Are you sure you want to delete the selected dataset?`)) {
            await deleteDatasetById(currentDatasetId);
            datasetSelector.value = "";  // Reset the selector
            await clearExistingData();   // Clear the visualization
            await fetchDatasets();  // Refresh the dataset list
        }
    } else {
        // No dataset is selected, open the modal to choose a dataset to delete
        const dialog = await createDeleteDatasetDialog();
        dialog.showModal();
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
        const datasets = await fetchDatasets();
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
            await fetchDatasets();  // Refresh the dataset list
        }
    });

    cancelButton.addEventListener('click', () => {
        dialog.close();
    });

    return dialog;
}
