import { scene } from './core.js';
import { nodes, addNode, setPinnedNode } from './nodeManager.js';
import { lines, loadedConnections, addConnection } from './connectionManager.js';
import { updateVisibleElements } from './utils.js';
import { focusOnAllNodes } from './cameraControls.js';

export function initDatasetManager() {
    const datasetSelector = document.getElementById('datasetSelector');
    if (datasetSelector) {
        datasetSelector.addEventListener('change', handleDatasetChange);
        fetchDatasets();
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

    fetch(`/api/dataset/${datasetId}`)
        .then(response => response.json())
        .then(data => {
            clearExistingData();
            loadNodesFromData(data.nodes);
            loadConnectionsFromData(data.connections);
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
        .then(response => response.json())
        .then(datasets => {
            const datasetSelector = document.getElementById('datasetSelector');
            if (!datasetSelector) {
                console.error("Dataset selector element not found");
                return;
            }
            datasetSelector.innerHTML = '<option value="">Select a dataset</option>';
            datasets.forEach(dataset => {
                const option = document.createElement('option');
                option.value = dataset.id;
                option.textContent = dataset.name;
                datasetSelector.appendChild(option);
            });
            // Ensure "Select a dataset" is selected
            datasetSelector.value = "";
        })
        .catch(error => console.error('Error fetching datasets:', error));
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
        alert('No dataset selected');
        return;
    }

    if (confirm('Are you sure you want to delete this dataset?')) {
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
            // Optionally, load the most recent dataset
            loadMostRecentDataset();
        })
        .catch(error => {
            console.error('Error deleting dataset:', error);
            alert('Failed to delete dataset. Please try again.');
        });
    }
}
