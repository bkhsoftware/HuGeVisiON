export const genealogyMode = {
    name: 'Genealogy',
    uploadForm: null,
    data: null,
    initialize: function() {
        return Promise.resolve();  // Don't load any data by default
    },
    activate: function() {
        console.log('Activating Genealogy Mode');
        this.createUploadForm();
    },
    deactivate: function() {
        console.log('Deactivating Genealogy Mode');
        this.removeUploadForm();
    },
    interpretData: function() {
        console.log("Interpreting data for genealogy visualization");
        if (!this.data || !this.data.nodes || this.data.nodes.length === 0) {
            console.log("No data available for genealogy mode");
            return { nodes: [], connections: [] };
        }
        this.printTreeStructure(this.data.nodes, this.data.connections);
        const layoutedNodes = this.layoutNodesAsTree(this.data.nodes, this.data.connections);
        return { nodes: layoutedNodes, connections: this.data.connections };
    },
    customizeVisuals: function(scene, nodes, connections) {
        Object.values(nodes).forEach(node => {
            if (node.userData.sex === 'M') {
                node.material.color.setHex(0x4444ff); // Blue for male
            } else if (node.userData.sex === 'F') {
                node.material.color.setHex(0xff4444); // Red for female
            } else {
                node.material.color.setHex(0x44ff44); // Green for unknown/other
            }
        });

        Object.values(connections).forEach(connection => {
            if (connection.userData.type === 'Parent-Child') {
                connection.material.color.setHex(0xffff00); // Yellow for parent-child
            } else if (connection.userData.type === 'Spouse') {
                connection.material.color.setHex(0xff00ff); // Magenta for spouse
            }
        });
    },
    createUploadForm: function() {
        if (!this.uploadForm) {
            this.uploadForm = document.createElement('form');
            this.uploadForm.id = 'gedUploadForm';
            this.uploadForm.enctype = 'multipart/form-data';
            this.uploadForm.innerHTML = `
                <input type="file" id="gedFile" name="file" accept=".ged" style="display: none;">
                <button type="button" id="uploadButton">Upload GED File</button>
            `;
            document.getElementById('controls').appendChild(this.uploadForm);
            
            document.getElementById('uploadButton').addEventListener('click', () => {
                document.getElementById('gedFile').click();
            });
            
            document.getElementById('gedFile').addEventListener('change', this.handleFileUpload.bind(this));
        }
    },
    removeUploadForm: function() {
        if (this.uploadForm && this.uploadForm.parentNode) {
            this.uploadForm.parentNode.removeChild(this.uploadForm);
        }
    },
    handleFileUpload: function(e) {
        const file = e.target.files[0];
        if (!file) {
            console.error('No file selected');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/upload_ged', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('GED file processed:', data);
            if (data.nodes && data.connections) {
                console.log(`Received ${data.nodes.length} nodes and ${data.connections.length} connections`);
                this.loadDataset(data.dataset_id, data.nodes, data.connections);
                
                // Update the dataset selector
                const datasetSelector = document.getElementById('datasetSelector');
                const option = document.createElement('option');
                option.value = data.dataset_id;
                option.textContent = data.dataset_name;
                datasetSelector.appendChild(option);
                datasetSelector.value = data.dataset_id;
                
                // Trigger change event to update UI
                datasetSelector.dispatchEvent(new Event('change'));
            } else {
                console.error('Invalid data received from server');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    },
    loadDataset: function(datasetId, nodes, connections) {
        console.log(`Loading dataset ${datasetId} with ${nodes.length} nodes and ${connections.length} connections`);
        
        // Clear existing data
        clearNodes();
        clearConnections();

        // Apply layout
        const layoutedNodes = this.layoutNodesAsTree(nodes, connections);

        // Load new data
        layoutedNodes.forEach(node => {
            console.log(`Adding node: ${JSON.stringify(node)}`);
            addNode({
                id: node.id,
                name: node.name,
                type: node.type,
                x: node.x || 0,
                y: node.y || 0,
                z: node.z || 0,
                sex: node.sex
            });
        });

        connections.forEach(connection => {
            console.log(`Adding connection: ${JSON.stringify(connection)}`);
            addConnection(connection);
        });

        updateVisibleElements();
        
        // Log the positions of all nodes to verify
        console.log("Final node positions:");
        Object.values(getNodes()).forEach(node => {
            console.log(`Node ${node.id} position: (${node.position.x}, ${node.position.y}, ${node.position.z})`);
        });

        // Calculate and log the bounding box of all nodes
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
        Object.values(getNodes()).forEach(node => {
            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y);
            minZ = Math.min(minZ, node.position.z);
            maxZ = Math.max(maxZ, node.position.z);
        });
        console.log(`Bounding box: X(${minX}, ${maxX}), Y(${minY}, ${maxY}), Z(${minZ}, ${maxZ})`);
    },
    layoutNodesAsTree: function(nodes, connections) {
        console.log("Starting layoutNodesAsTree");
        console.log("Input nodes:", nodes);
        console.log("Input connections:", connections);

        const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [], parents: [] }]));

        // Build the tree structure
        connections.forEach(conn => {
            if (conn.type === 'Parent-Child') {
                const parent = nodeMap.get(conn.from_node_id);
                const child = nodeMap.get(conn.to_node_id);
                if (parent && child) {
                    parent.children.push(child);
                    child.parents.push(parent);
                }
            }
        });

        // Find root nodes (nodes without parents)
        const rootNodes = Array.from(nodeMap.values()).filter(node => node.parents.length === 0);
        console.log(`Found ${rootNodes.length} root nodes:`, rootNodes);

        // If there are no root nodes, treat all nodes as roots
        if (rootNodes.length === 0) {
            rootNodes.push(...nodeMap.values());
            console.log("No root nodes found, using all nodes as roots");
        }

        // Recursively set positions
        function setPositions(node, x, y, level, maxWidth, visited = new Set()) {
            if (visited.has(node.id)) {
                console.warn(`Cycle detected at node ${node.id}`);
                return;
            }
            visited.add(node.id);

            node.x = x;
            node.y = y;
            node.z = 0;
            console.log(`Set position for node ${node.id}: (${x}, ${y}, 0)`);

            const levelSpacing = 500;
            const childSpacing = node.children.length > 0 ? maxWidth / (node.children.length + 1) : 250;

            let totalWidth = (node.children.length - 1) * childSpacing;
            let startX = x - totalWidth / 2;

            node.children.forEach((child, index) => {
                setPositions(child, startX + (index + 1) * childSpacing, y + levelSpacing, level + 1, childSpacing, visited);
            });
        }

        // Layout each tree
        const treeSpacing = 2000;
        rootNodes.forEach((root, index) => {
            console.log(`Laying out tree for root node ${root.id}`);
            setPositions(root, index * treeSpacing, 0, 0, treeSpacing);
        });

        // Return the updated nodes
        const layoutedNodes = Array.from(nodeMap.values());
        console.log("Laid out nodes:", layoutedNodes);
        return layoutedNodes;
    },
    logNodePositions: function(nodes) {
        console.log("Node positions:");
        nodes.forEach(node => {
            console.log(`Node ${node.id}: (${node.x}, ${node.y}, ${node.z})`);
        });
    },
    logNodePositions: function(nodes) {
        console.log("Node positions:");
        nodes.forEach(node => {
            console.log(`Node ${node.id}: (${node.x}, ${node.y}, ${node.z})`);
        });
    },
    printTreeStructure: function(nodes, connections) {
        const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [], parents: [] }]));

        connections.forEach(conn => {
            const parent = nodeMap.get(conn.from_node_id);
            const child = nodeMap.get(conn.to_node_id);
            if (parent && child) {
                parent.children.push(child.id);
                child.parents.push(parent.id);
            }
        });

        console.log("Tree Structure:");
        nodeMap.forEach((node, id) => {
            console.log(`Node ${id} (${node.name}):`);
            console.log(`  Parents: ${node.parents.join(', ')}`);
            console.log(`  Children: ${node.children.join(', ')}`);
        });
    }
};

