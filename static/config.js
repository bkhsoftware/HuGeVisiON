export let MAX_CONNECTIONS = 1000;
export let MAX_NODES = 1000;
export let RENDER_DISTANCE = Infinity;

export function setMaxConnections(value) {
    MAX_CONNECTIONS = value;
}

export function setMaxNodes(value) {
    MAX_NODES = value;
}

export function setRenderDistance(value) {
    RENDER_DISTANCE = value;
}
