/* ============================================================
   DATA STRUCTURES MODULE
   Adjacency List & Infection Queue for O(V+E) traversal
   ============================================================ */

/**
 * Adjacency List representation using Map<NodeID, Array<Edge>>
 * Enables O(V+E) traversal for BFS/DFS operations
 */
class AdjacencyList {
    constructor() {
        this.adjacency = new Map();
    }

    addNode(nodeId) {
        if (!this.adjacency.has(nodeId)) {
            this.adjacency.set(nodeId, []);
        }
    }

    addEdge(from, to, weight = 1) {
        this.addNode(from);
        this.addNode(to);
        this.adjacency.get(from).push({ target: to, weight });
        this.adjacency.get(to).push({ target: from, weight });
    }

    getNeighbors(nodeId) {
        return this.adjacency.get(nodeId) || [];
    }

    getNodes() {
        return Array.from(this.adjacency.keys());
    }

    clear() {
        this.adjacency.clear();
    }

    get size() {
        return this.adjacency.size;
    }
}

/**
 * Infection Queue - Optimized Set-based queue for infection processing
 * Prevents O(N²) checks by only processing infected nodes' neighbors
 */
class InfectionQueue {
    constructor() {
        this.queue = new Set();
    }

    enqueue(nodeId) {
        this.queue.add(nodeId);
    }

    dequeue() {
        const first = this.queue.values().next().value;
        this.queue.delete(first);
        return first;
    }

    remove(nodeId) {
        this.queue.delete(nodeId);
    }

    has(nodeId) {
        return this.queue.has(nodeId);
    }

    isEmpty() {
        return this.queue.size === 0;
    }

    getAll() {
        return Array.from(this.queue);
    }

    clear() {
        this.queue.clear();
    }

    get size() {
        return this.queue.size;
    }
}

/**
 * Infection Path Tracker - Records disease transmission paths
 * Used for visualizing spread in the network
 */
class InfectionPathTracker {
    constructor() {
        this.paths = []; // Array of {from, to, tick}
        this.maxPaths = 500; // Limit for performance
    }

    addPath(fromId, toId, tick) {
        this.paths.push({ from: fromId, to: toId, tick });
        // Keep only recent paths for visualization
        if (this.paths.length > this.maxPaths) {
            this.paths.shift();
        }
    }

    getRecentPaths(withinTicks = 5, currentTick = 0) {
        return this.paths.filter(p => currentTick - p.tick <= withinTicks);
    }

    clear() {
        this.paths = [];
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdjacencyList, InfectionQueue, InfectionPathTracker };
}
