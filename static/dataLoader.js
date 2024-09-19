import { addNode, nodes, clearNodes } from './nodeManager.js';
import { addConnection, loadedConnections, clearConnections } from './connectionManager.js';
import { MAX_NODES, MAX_CONNECTIONS, RENDER_DISTANCE } from './config.js'
import { camera } from './core.js';
import { updateVisibleElements } from './utils.js';

let currentPage = 1;
const perPage = 100;
let totalPages = 1;
let loadedNodes = new Set();
let nodeCache = {};
let connectionCache = {};
let lastFetchTime = 0;
const FETCH_COOLDOWN = 5000;


export function initDataLoader() {
    // Don't load any dataset by default
    console.log("Data loader initialized. No dataset loaded by default.");
}

export function loadDataset(datasetId) {
    if (!datasetId) {
        console.error('No dataset ID provided');
        return Promise.reject(new Error('No dataset ID provided'));
    }

    return fetch(`/api/dataset/${datasetId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Dataset with id ${datasetId} not found`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.nodes && data.connections) {
                console.log(`Loading dataset ${datasetId} with ${data.nodes.length} nodes and ${data.connections.length} connections`);
                
                // Clear existing data
                clearNodes();
                clearConnections();
                
                // Load new data
                data.nodes.forEach(node => {
                    addNode(node);
                });

                data.connections.forEach(connection => {
                    addConnection(connection);
                });

                updateVisibleElements();
            } else {
                console.log(`Dataset ${datasetId} is empty or not found.`);
            }
        })
        .catch(error => {
            console.error('Error loading dataset:', error);
            // Handle the error appropriately, maybe show a message to the user
        });
}

function loadMostRecentDataset() {
    fetch('/api/most_recent_dataset')
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    console.log("No datasets found. Creating a default dataset.");
                    return createDefaultDataset();
                }
                throw new Error('Error fetching dataset');
            }
            return response.json();
        })
        .then(data => {
            if (data.dataset && data.dataset.id) {
                return loadDataset(data.dataset.id);
            } else if (data.dataset_id) {
                return loadDataset(data.dataset_id);
            } else {
                console.log("No valid dataset found or created.");
                return null;
            }
        })
        .catch(error => {
            console.error('Error loading most recent dataset:', error);
            // You might want to add some user feedback here
        })
        .finally(() => {
            // Ensure the visualization is started even if no data is loaded
            startVisualization();
        });
}

export function loadNodesInView() {
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
        return; // Don't fetch if we've fetched recently
    }
    lastFetchTime = now;

    const position = camera.position;
    const currentDatasetId = getCurrentDatasetId(); // You need to implement this function
    if (!currentDatasetId) {
        console.log("No dataset selected. Skipping node loading.");
        return;
    }

    const url = `/api/nodes?dataset_id=${currentDatasetId}&page=${currentPage}&per_page=${perPage}&x=${position.x}&y=${position.y}&z=${position.z}&radius=${RENDER_DISTANCE}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            // ... rest of the function remains the same
        })
        .catch(error => {
            console.error('Error loading nodes:', error);
        });
}

function getCurrentDatasetId() {
    const datasetSelector = document.getElementById('datasetSelector');
    return datasetSelector ? datasetSelector.value : null;
}

export function loadConnections() {
    const nodeIds = Object.keys(nodes).filter(id => id !== 'undefined');
    if (nodeIds.length === 0) {
        console.log("No valid node IDs to load connections for.");
        return;
    }
    const url = `/api/connections?node_ids=${nodeIds.join(',')}&page=${currentPage}&per_page=${perPage}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.connections.length} connections`);
            data.connections.forEach(connection => {
                if (!connectionCache[connection.id]) {
                    connectionCache[connection.id] = connection;
                    if (nodes[connection.from_node_id] && nodes[connection.to_node_id]) {
                        addConnection(connection);
                    }
                }
            });

            if (currentPage < data.total_pages && loadedConnections.size < MAX_CONNECTIONS) {
                currentPage++;
                loadConnections();
            } else {
                console.log(`Reached maximum connections (${loadedConnections.size}) or all pages loaded.`);
            }
            updateVisibleElements();
        })
        .catch(error => console.error('Error loading connections:', error));
}

export function cleanupCache() {
    const now = Date.now();
    Object.keys(nodeCache).forEach(id => {
        if (now - nodeCache[id].lastAccessed > 300000) { // 5 minutes
            delete nodeCache[id];
        }
    });
    Object.keys(connectionCache).forEach(id => {
        if (now - connectionCache[id].lastAccessed > 300000) { // 5 minutes
            delete connectionCache[id];
        }
    });
}

function createDefaultDataset() {
    return fetch('/api/create_default_dataset', {
        method: 'POST',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Default dataset created:', data);
        if (data.dataset && data.dataset.id) {
            return loadDataset(data.dataset.id);
        } else {
            throw new Error('No dataset_id returned after creating default dataset');
        }
    })
    .catch(error => {
        console.error('Error creating default dataset:', error);
        // Handle the error appropriately, maybe show a message to the user
    });
}

