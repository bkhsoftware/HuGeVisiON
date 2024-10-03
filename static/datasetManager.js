import { scene } from './core.js';
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
    } else {
        console.warn("Dataset selector element not found");
    }

    const deleteDatasetButton = document.getElementById('deleteDatasetButton');
    if (deleteDatasetButton) {
        deleteDatasetButton.addEventListener('click', deleteCurrentDataset);
    } else {
        console.warn("Delete dataset button not found");
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

    // Update the scene
    updateVisibleElements();
    
    // Force a render to clear any remaining visuals
    if (window.renderer) {
        window.renderer.render(scene, window.camera);
    }
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

export function deleteCurrentDataset() {
    const datasetSelector = document.getElementById('datasetSelector');
    const currentDatasetId = datasetSelector.value;

    if (!currentDatasetId) {
        console.log('No dataset selected');
        return;
    }

    fetch(`/api/dataset/${currentDatasetId}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        console.log('Dataset deleted:', result);
        // Remove the deleted dataset from the selector
        const option = datasetSelector.querySelector(`option[value="${currentDatasetId}"]`);
        if (option) {
            option.remove();
        }
        // Reset the selector to "Select a dataset"
        datasetSelector.value = "";
        // Clear the visualization
        clearExistingData();
        // Update the dataset list
        fetchDatasets();
        // Optionally, show a message to the user
        console.log("Dataset deleted successfully. Select another dataset to view.");
    })
    .catch(error => {
        console.error('Error deleting dataset:', error);
        // Handle the error, maybe show a message to the user
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
