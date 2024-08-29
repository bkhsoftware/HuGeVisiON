import { addNode, nodes } from './nodeManager.js';
import { addConnection, loadedConnections } from './connectionManager.js';
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
    // ... (existing data loading initialization)
}

export function loadNodesInView() {
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
        return; // Don't fetch if we've fetched recently
    }
    lastFetchTime = now;

    const position = camera.position;
    const url = `/api/nodes?page=${currentPage}&per_page=${perPage}&x=${position.x}&y=${position.y}&z=${position.z}&radius=${RENDER_DISTANCE}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`Loaded ${data.nodes.length} nodes`);
            totalPages = data.total_pages;
            data.nodes.forEach(node => {
                if (!nodeCache[node.id]) {
                    nodeCache[node.id] = node;
                    addNode(node);
                }
            });

            if (currentPage < totalPages && Object.keys(nodes).length < MAX_NODES) {
                currentPage++;
                loadNodesInView();
            } else {
                currentPage = 1;
                loadConnections();
            }
            updateVisibleElements();
        })
        .catch(error => console.error('Error loading nodes:', error));
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

// ... (other data loading functions)
