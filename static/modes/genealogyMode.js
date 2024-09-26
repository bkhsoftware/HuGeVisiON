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
    interpretData: function(data) {
        console.log("Interpreting data for genealogy visualization");
        if (!data || !data.nodes || data.nodes.length === 0) {
            console.log("No data available for genealogy mode");
            return { nodes: [], connections: [] };
        }
        console.log("Raw data:", data);
        
        // Implement the tree layout logic here
        const layoutedNodes = this.layoutNodesAsTree(data.nodes, data.connections);
        
        console.log("Laid out nodes:", layoutedNodes);
        return { nodes: layoutedNodes, connections: data.connections };
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
        console.log("Starting improved layoutNodesAsTree");
        console.log("Input nodes:", nodes);
        console.log("Input connections:", connections);

        const LEVEL_SPACING = 100;  // Vertical spacing between generations
        const NODE_SPACING = 50;    // Horizontal spacing between siblings
        const TREE_SPACING = 50;   // Horizontal spacing between separate family trees
        const SPOUSE_SPACING = 30;  // Horizontal spacing between spouses

        // Helper function to build node map and relationships
        function buildNodeMap(nodes, connections) {
            const nodeMap = new Map(nodes.map(node => [node.id, { ...node, children: [], parents: [], spouses: [], level: 0, x: 0, y: 0, z: 0 }]));
            
            connections.forEach(conn => {
                if (conn.type === 'Parent-Child') {
                    const parent = nodeMap.get(conn.from_node_id);
                    const child = nodeMap.get(conn.to_node_id);
                    if (parent && child) {
                        parent.children.push(child);
                        child.parents.push(parent);
                    }
                } else if (conn.type === 'Spouse') {
                    const spouse1 = nodeMap.get(conn.from_node_id);
                    const spouse2 = nodeMap.get(conn.to_node_id);
                    if (spouse1 && spouse2) {
                        spouse1.spouses.push(spouse2);
                        spouse2.spouses.push(spouse1);
                    }
                }
            });

            return nodeMap;
        }

        // Helper function to find and sort root nodes
        function findAndSortRootNodes(nodeMap) {
            const rootNodes = Array.from(nodeMap.values()).filter(node => node.parents.length === 0);
            console.log("Root nodes before sorting:", rootNodes);  // Add this debug line
            const sortedRootNodes = rootNodes.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
            console.log("Root nodes after sorting:", sortedRootNodes);  // Add this debug line
            return sortedRootNodes;
        }

        // Helper function to assign levels (generations)
        function assignLevels(node, level = 0, visited = new Set()) {
            if (visited.has(node.id)) return;
            visited.add(node.id);
            
            node.level = Math.max(node.level, level);
            node.children.forEach(child => assignLevels(child, level + 1, visited));
            node.spouses.forEach(spouse => assignLevels(spouse, level, visited));
        }

        // Helper function to calculate vertical positions
        function calculateVerticalPositions(nodeMap) {
            const levelMap = new Map();
            nodeMap.forEach(node => {
                if (!levelMap.has(node.level)) {
                    levelMap.set(node.level, []);
                }
                levelMap.get(node.level).push(node);
            });

            levelMap.forEach((nodesInLevel, level) => {
                console.log(`Calculating vertical positions for level ${level}`);  // Add this debug line
                console.log("Nodes in level before sorting:", nodesInLevel);  // Add this debug line
                nodesInLevel.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
                console.log("Nodes in level after sorting:", nodesInLevel);  // Add this debug line
                nodesInLevel.forEach((node, index) => {
                    node.y = -level * LEVEL_SPACING - index * (LEVEL_SPACING / (nodesInLevel.length + 1));
                    console.log(`Node ${node.id} positioned at y=${node.y}`);  // Add this debug line
                });
            });
        }

        // Helper function to layout a family tree
        function layoutFamilyTree(node, xOffset = 0, visited = new Set()) {
            if (visited.has(node.id)) return 0;
            visited.add(node.id);

            let totalWidth = NODE_SPACING;

            // Position children
            if (node.children.length > 0) {
                const childrenWidth = node.children.reduce((sum, child) => 
                    sum + layoutFamilyTree(child, xOffset + totalWidth, visited), 0);
                totalWidth += childrenWidth;
            }

            // Position node
            node.x = xOffset + totalWidth / 2;

            // Position spouses
            node.spouses.forEach((spouse, index) => {
                if (!visited.has(spouse.id)) {
                    spouse.x = node.x + (index + 1) * SPOUSE_SPACING;
                    spouse.y = node.y;
                    visited.add(spouse.id);
                }
            });

            return Math.max(totalWidth, NODE_SPACING);
        }

        // Helper function to handle spouse relationships
        function handleSpouseRelationships(nodeMap) {
            nodeMap.forEach(node => {
                if (node.spouses.length > 0) {
                    const averageX = node.spouses.reduce((sum, spouse) => sum + spouse.x, node.x) / (node.spouses.length + 1);
                    node.x = averageX;
                    node.spouses.forEach(spouse => {
                        spouse.x = averageX;
                    });
                }
            });
        }

        // Helper function for final layout adjustments
        function finalLayoutAdjustments(nodeMap) {
            // Implement collision detection and resolution if needed
            // This is a placeholder for potential future improvements
        }

        // Main layout logic
        const nodeMap = buildNodeMap(nodes, connections);
        const rootNodes = findAndSortRootNodes(nodeMap);

        rootNodes.forEach(root => assignLevels(root));
        calculateVerticalPositions(nodeMap);

        let xOffset = 0;
        rootNodes.forEach((root, index) => {
            const treeWidth = layoutFamilyTree(root, xOffset);
            xOffset += treeWidth + TREE_SPACING;
        });

        handleSpouseRelationships(nodeMap);
        finalLayoutAdjustments(nodeMap);

        // Adjust vertical positions of family trees based on root node years
        const minRootYear = Math.min(...rootNodes.map(root => root.birthYear || Infinity));
        const yearSpacing = LEVEL_SPACING / 2; // Adjust this value to control vertical spacing between trees
        rootNodes.forEach(root => {
            const verticalOffset = ((root.birthYear || minRootYear) - minRootYear) * yearSpacing;
            const adjustNodes = (node, visited = new Set()) => {
                if (visited.has(node.id)) return;
                visited.add(node.id);
                node.y -= verticalOffset;
                node.children.forEach(child => adjustNodes(child, visited));
                node.spouses.forEach(spouse => adjustNodes(spouse, visited));
            };
            adjustNodes(root);
        });

        const layoutedNodes = Array.from(nodeMap.values());
        console.log("Laid out nodes:", layoutedNodes);
        return layoutedNodes;
    }
};

