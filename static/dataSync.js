import { nodes } from './nodeManager.js';
import { lines } from './connectionManager.js';

export function initDataSync() {
    // Set up periodic sync
    setInterval(syncDataWithServer, 300000); // Sync every 5 minutes
}

export function syncDataWithServer() {
    const data = {
        nodes: Object.values(nodes).map(node => node.userData),
        connections: Object.values(lines).map(line => line.userData)
    };

    fetch('/api/sync_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        /*console.log('Sync result:', result);*/
    })
    .catch(error => {
        console.error('Sync error:', error);
    });
}

// Function to trigger sync after significant changes
export function triggerSync() {
    syncDataWithServer();
}
