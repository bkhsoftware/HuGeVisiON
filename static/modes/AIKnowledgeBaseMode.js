import { THREE } from '../core.js';
import { showInfoPanelWithDelay } from '../uiManager.js';

export const AIKnowledgeBaseMode = {
    name: 'AI Knowledge Base',

    activate() {
        console.log('Activating AI Knowledge Base mode');
        this.setupUI();
    },

    deactivate() {
        console.log('Deactivating AI Knowledge Base mode');
        this.cleanupUI();
    },

    setupUI() {
        // Add search bar
        const searchBar = document.createElement('input');
        searchBar.type = 'text';
        searchBar.id = 'ai-kb-search';
        searchBar.placeholder = 'Search AI concepts...';
        searchBar.addEventListener('input', this.handleSearch.bind(this));
        document.body.appendChild(searchBar);
    },

    cleanupUI() {
        const searchBar = document.getElementById('ai-kb-search');
        if (searchBar) searchBar.remove();
    },

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        // Implement search logic here
        console.log('Searching for:', searchTerm);
    },

    interpretData(rawData) {
        return {
            nodes: rawData.nodes.map(node => ({
                ...node,
                importance: node.importance || 1,
                confidence: node.confidence || 1,
                subtype: node.subtype || 'General',
            })),
            connections: rawData.connections.map(conn => ({
                ...conn,
                strength: conn.strength || 1,
                confidence: conn.confidence || 1,
            })),
        };
    },

    customizeNode(node, nodeData) {
        node.scale.setScalar(nodeData.importance * 0.5 + 0.5);
        node.material.color.setHex(this.getColorForConceptType(nodeData.subtype));
        node.material.opacity = nodeData.confidence;
        
        // Add text label
        const textSprite = this.createTextSprite(nodeData.name);
        node.add(textSprite);
    },

    customizeConnection(line, connData) {
        line.material.color.setHex(this.getColorForRelationType(connData.type));
        line.material.linewidth = connData.strength * 2;
        line.material.opacity = connData.confidence;
    },

    handleClick(object) {
        if (object.userData.type === 'concept') {
            this.showConceptDetails(object);
        } else if (object.userData.type === 'relation') {
            this.showRelationDetails(object);
        }
    },

    onNodeAdded(nodeData) {
        console.log('New concept added to AI Knowledge Base:', nodeData);
        // Trigger backend update here
    },

    onConnectionAdded(connData) {
        console.log('New relation added to AI Knowledge Base:', connData);
        // Trigger backend update here
    },

    showConceptDetails(node) {
        // Customize the node's userData for display
        node.userData.name = node.userData.name || 'Unnamed Concept';
        node.userData.type = 'AI Concept';
        node.userData.subtype = node.userData.subtype || 'General';
        node.userData.importance = node.userData.importance || 1;
        node.userData.confidence = node.userData.confidence || 1;
        node.userData.description = node.userData.description || 'No description available.';

        showInfoPanelWithDelay(node);
    },

    showRelationDetails(line) {
        // Create a mock node object for the relation to use with showInfoPanelWithDelay
        const relationNode = {
            userData: {
                name: line.userData.type || 'Unnamed Relation',
                type: 'AI Relation',
                from: line.userData.from,
                to: line.userData.to,
                strength: line.userData.strength || 1,
                confidence: line.userData.confidence || 1
            },
            position: line.position // Use the line's position for panel placement
        };

        showInfoPanelWithDelay(relationNode);
    },

    validateNodeData(nodeData) {
        return {
            ...nodeData,
            type: 'concept',
            subtype: nodeData.subtype || 'General',
            importance: nodeData.importance || 1,
            confidence: nodeData.confidence || 1,
        };
    },

    validateConnectionData(connData) {
        return {
            ...connData,
            type: connData.type || 'RelatedTo',
            strength: connData.strength || 1,
            confidence: connData.confidence || 1,
        };
    },

    getColorForConceptType(type) {
        const colors = {
            'Algorithm': 0x00ff00,
            'Model': 0xff0000,
            'Dataset': 0x0000ff,
            'Technique': 0xffff00,
            'Theory': 0xff00ff,
            'Application': 0x00ffff,
        };
        return colors[type] || 0xcccccc;
    },

    getColorForRelationType(type) {
        const colors = {
            'IsA': 0x00ff00,
            'Implements': 0xff0000,
            'DependsOn': 0x0000ff,
            'Improves': 0xffff00,
            'Contradicts': 0xff00ff,
            'RelatedTo': 0x00ffff,
        };
        return colors[type] || 0xaaaaaa;
    },

    createTextSprite(message) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.fillText(message, 0, 24);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1, 0.5, 1);
        sprite.position.set(0, 1, 0);
        
        return sprite;
    },
};
