/* ============================================================
   VISUALIZATION MODULE
   D3.js Force-Directed Graph with custom shapes
   ============================================================ */

/**
 * Initialize D3 visualization
 */
function initVisualization(container, people, buildings, graph, pathTracker) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear existing
    d3.select(container).select('svg').remove();

    const svg = d3.select(container)
        .append('svg')
        .attr('id', 'network-svg')
        .attr('width', width)
        .attr('height', height);

    // Create groups for layering
    const linkGroup = svg.append('g').attr('class', 'links');
    const infectionPathGroup = svg.append('g').attr('class', 'infection-paths');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // Prepare nodes and links for D3
    const nodes = [];
    const links = [];

    // Add building nodes
    for (const [id, building] of buildings) {
        nodes.push({
            id,
            nodeType: 'building',
            buildingType: building.type,
            label: building.label,
            occupantCount: building.occupants.length
        });
    }

    // Add people nodes
    for (const [id, person] of people) {
        nodes.push({
            id,
            nodeType: 'person',
            ageGroup: person.ageGroup,
            gender: person.gender,
            state: person.state,
            homeId: person.homeId,
            activityId: person.activityId
        });

        // Create links to buildings
        links.push({ source: id, target: person.homeId, type: 'home' });
        if (person.activityId !== person.homeId) {
            links.push({ source: id, target: person.activityId, type: 'activity' });
        }
    }

    // Create force simulation optimized for large networks
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(d => d.source.nodeType === 'building' || d.target.nodeType === 'building' ? 40 : 15)
            .strength(0.15))
        .force('charge', d3.forceManyBody()
            .strength(d => d.nodeType === 'building' ? -120 : -5)
            .distanceMax(150))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide()
            .radius(d => d.nodeType === 'building' ? 20 : 4))
        .force('x', d3.forceX(width / 2).strength(0.04))
        .force('y', d3.forceY(height / 2).strength(0.04))
        .alphaDecay(0.025);

    // Draw links (edges) - very thin for large networks
    const link = linkGroup.selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', 'rgba(255,255,255,0.03)')
        .attr('stroke-width', 0.3);

    // Draw building nodes with distinct shapes
    const buildingNodes = nodeGroup.selectAll('.building-node')
        .data(nodes.filter(n => n.nodeType === 'building'))
        .enter()
        .append('g')
        .attr('class', 'building-node')
        .call(d3.drag()
            .on('start', (event, d) => dragstarted(event, d, simulation))
            .on('drag', dragged)
            .on('end', (event, d) => dragended(event, d, simulation)));

    // Add shapes based on building type (smaller sizes)
    buildingNodes.each(function(d) {
        const g = d3.select(this);
        const color = getBuildingColor(d.buildingType);
        const size = BUILDING_SIZES[d.buildingType] || 12;
        
        if (d.buildingType === BuildingType.HOME) {
            // Hexagon for homes
            g.append('polygon')
                .attr('points', createHexagonPoints(size))
                .attr('fill', color)
                .attr('fill-opacity', 0.25)
                .attr('stroke', color)
                .attr('stroke-width', 1.5);
        } else if (d.buildingType === BuildingType.COLLEGE) {
            // Circle for colleges
            g.append('circle')
                .attr('r', size)
                .attr('fill', color)
                .attr('fill-opacity', 0.25)
                .attr('stroke', color)
                .attr('stroke-width', 1.5);
        } else if (d.buildingType === BuildingType.MALL) {
            // Square for malls
            g.append('rect')
                .attr('x', -size)
                .attr('y', -size)
                .attr('width', size * 2)
                .attr('height', size * 2)
                .attr('fill', color)
                .attr('fill-opacity', 0.25)
                .attr('stroke', color)
                .attr('stroke-width', 1.5);
        } else if (d.buildingType === BuildingType.HOSPITAL) {
            // Cross/Plus for hospitals
            g.append('path')
                .attr('d', createCrossPath(size))
                .attr('fill', color)
                .attr('fill-opacity', 0.25)
                .attr('stroke', color)
                .attr('stroke-width', 1.5);
        }
    });

    // Add labels to buildings (smaller font)
    buildingNodes.append('text')
        .attr('class', 'building-label')
        .attr('text-anchor', 'middle')
        .attr('dy', 3)
        .attr('fill', 'rgba(255,255,255,0.6)')
        .attr('font-size', '6px')
        .attr('pointer-events', 'none')
        .text(d => d.label.length > 8 ? d.label.substring(0, 6) + '..' : d.label);

    // Draw people nodes (circles with size based on age - smaller)
    const personNodes = nodeGroup.selectAll('.person-node')
        .data(nodes.filter(n => n.nodeType === 'person'))
        .enter()
        .append('circle')
        .attr('class', 'person-node')
        .attr('r', d => AGE_SIZES[d.ageGroup])
        .attr('fill', d => getStateColor(d.state))
        .attr('stroke', d => d.gender === Gender.MALE ? COLORS.male : COLORS.female)
        .attr('stroke-width', 1);

    // Update positions on each tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        buildingNodes.attr('transform', d => `translate(${d.x},${d.y})`);
        personNodes.attr('cx', d => d.x).attr('cy', d => d.y);
    });

    // Cool down faster for large networks
    setTimeout(() => simulation.alphaTarget(0), 5000);

    return {
        svg,
        simulation,
        nodeGroup,
        linkGroup,
        infectionPathGroup,
        personNodes,
        buildingNodes,
        nodes,
        links,
        width,
        height
    };
}

/**
 * Update node colors based on current state
 */
function updateVisualization(vizState, people, pathTracker, currentTick) {
    if (!vizState || !vizState.personNodes) return;

    // Update person node colors
    vizState.personNodes.attr('fill', function(d) {
        const person = people.get(d.id);
        return person ? getStateColor(person.state) : COLORS.susceptible;
    });

    // Update infection paths (show recent transmissions)
    const recentPaths = pathTracker.getRecentPaths(3, currentTick);
    
    vizState.infectionPathGroup.selectAll('.infection-path').remove();
    
    if (recentPaths.length > 0 && recentPaths.length < 100) {
        const nodeMap = new Map(vizState.nodes.map(n => [n.id, n]));
        
        vizState.infectionPathGroup.selectAll('.infection-path')
            .data(recentPaths)
            .enter()
            .append('line')
            .attr('class', 'infection-path')
            .attr('x1', d => nodeMap.get(d.from)?.x || 0)
            .attr('y1', d => nodeMap.get(d.from)?.y || 0)
            .attr('x2', d => nodeMap.get(d.to)?.x || 0)
            .attr('y2', d => nodeMap.get(d.to)?.y || 0)
            .attr('stroke', COLORS.infected)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,3')
            .attr('opacity', 0.7);
    }
}

/**
 * Get color based on disease state
 */
function getStateColor(state) {
    if (state === State.SUSCEPTIBLE) return COLORS.susceptible;
    if (state === State.INFECTED) return COLORS.infected;
    return COLORS.recovered;
}

/**
 * Get color based on building type
 */
function getBuildingColor(type) {
    switch (type) {
        case BuildingType.HOME: return COLORS.home;
        case BuildingType.COLLEGE: return COLORS.college;
        case BuildingType.MALL: return COLORS.mall;
        case BuildingType.HOSPITAL: return COLORS.hospital;
        default: return '#666';
    }
}

/**
 * Create hexagon points for SVG polygon
 */
function createHexagonPoints(size) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push(`${size * Math.cos(angle)},${size * Math.sin(angle)}`);
    }
    return points.join(' ');
}

/**
 * Create cross/plus path for hospitals
 */
function createCrossPath(size) {
    const w = size * 0.4;
    return `M${-w},${-size} L${w},${-size} L${w},${-w} L${size},${-w} L${size},${w} L${w},${w} L${w},${size} L${-w},${size} L${-w},${w} L${-size},${w} L${-size},${-w} L${-w},${-w} Z`;
}

/**
 * Drag handlers
 */
function dragstarted(event, d, simulation) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d, simulation) {
    if (!event.active) simulation.alphaTarget(0);
    if (d.nodeType !== 'building') {
        d.fx = null;
        d.fy = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initVisualization, updateVisualization, getStateColor, 
        getBuildingColor, createHexagonPoints, createCrossPath 
    };
}
