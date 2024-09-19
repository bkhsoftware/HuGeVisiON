import { nodes } from './nodeManager.js';
import { lines } from './connectionManager.js';

export function initDataSync() {
    // Set up periodic sync
    setInterval(syncDataWithServer, 300000); // Sync every 5 minutes
}

function syncDataWithServer() {
    const nodeData = nodes ? Object.values(nodes).map(node => node.userData) : [];
    const connectionData = lines ? Object.values(lines).map(line => line.userData) : [];

    const data = {
        nodes: nodeData,
        connections: connectionData
    };

    return fetch('/api/sync_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Sync successful:', data);
    })
    .catch(error => {
        console.error('Error during sync:', error);
        // You might want to implement some retry logic or user notification here
    });
}

let syncTimeout = null;

export function triggerSync() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    syncTimeout = setTimeout(() => {
        syncDataWithServer();
    }, 1000);  // Delay sync by 1 second to batch rapid changes
}
