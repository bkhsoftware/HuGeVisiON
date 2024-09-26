import { scene } from './core.js';
import { nodes, addNode, setPinnedNode } from './nodeManager.js';
import { lines, loadedConnections, addConnection } from './connectionManager.js';
import { updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';
import { getCurrentMode } from './modeManager.js';

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

function fetchDatasets() {
    fetch('/api/datasets')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(datasets => {
            const datasetSelector = document.getElementById('datasetSelector');
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
                // Optionally, add a disabled option to indicate no datasets
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = "No datasets available";
                datasetSelector.appendChild(option);
            }
        })
        .catch(error => {
            console.error('Error fetching datasets:', error);
            // Handle the error, maybe show a message to the user
        });
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

    // Update the scene
    updateVisibleElements();
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
