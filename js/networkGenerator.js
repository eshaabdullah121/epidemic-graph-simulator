/* ============================================================
   NETWORK GENERATOR MODULE
   Creates bipartite social network with People and Buildings
   ============================================================ */

/**
 * Generates a synthetic bipartite social network
 * @param {Object} params - Configuration parameters
 * @param {AdjacencyList} graph - Graph data structure
 * @param {Map} people - People storage
 * @param {Map} buildings - Buildings storage
 * @param {InfectionQueue} infectionQueue - Infection queue
 * @param {InfectionPathTracker} pathTracker - Path tracker
 */
function generateNetwork(params, graph, people, buildings, infectionQueue, pathTracker) {
    const { population, numBuildings, initialInfected } = params;

    // Clear existing state
    graph.clear();
    infectionQueue.clear();
    pathTracker.clear();
    people.clear();
    buildings.clear();

    // Calculate building counts based on ratios
    const numHomes = Math.floor(numBuildings * BUILDING_RATIOS[BuildingType.HOME]);
    const numColleges = Math.floor(numBuildings * BUILDING_RATIOS[BuildingType.COLLEGE]);
    const numMalls = Math.floor(numBuildings * BUILDING_RATIOS[BuildingType.MALL]);
    const numHospitals = numBuildings - numHomes - numColleges - numMalls;

    let buildingId = 0;

    // Create Home buildings (Hexagons)
    for (let i = 0; i < numHomes; i++) {
        const id = `B${buildingId++}`;
        buildings.set(id, {
            id,
            type: BuildingType.HOME,
            label: `Home ${i + 1}`,
            occupants: [],
            x: null,
            y: null
        });
        graph.addNode(id);
    }

    // Create College buildings (Circles)
    for (let i = 0; i < numColleges; i++) {
        const id = `B${buildingId++}`;
        buildings.set(id, {
            id,
            type: BuildingType.COLLEGE,
            label: `College ${i + 1}`,
            occupants: [],
            x: null,
            y: null
        });
        graph.addNode(id);
    }

    // Create Mall buildings (Squares)
    for (let i = 0; i < numMalls; i++) {
        const id = `B${buildingId++}`;
        buildings.set(id, {
            id,
            type: BuildingType.MALL,
            label: `Mall ${i + 1}`,
            occupants: [],
            x: null,
            y: null
        });
        graph.addNode(id);
    }

    // Create Hospital buildings (Cross)
    for (let i = 0; i < numHospitals; i++) {
        const id = `B${buildingId++}`;
        buildings.set(id, {
            id,
            type: BuildingType.HOSPITAL,
            label: `Hospital ${i + 1}`,
            occupants: [],
            x: null,
            y: null
        });
        graph.addNode(id);
    }

    // Get building IDs by type
    const homeIds = getBuildingIdsByType(buildings, BuildingType.HOME);
    const collegeIds = getBuildingIdsByType(buildings, BuildingType.COLLEGE);
    const mallIds = getBuildingIdsByType(buildings, BuildingType.MALL);
    const hospitalIds = getBuildingIdsByType(buildings, BuildingType.HOSPITAL);

    // Create People nodes with demographics
    for (let i = 0; i < population; i++) {
        const id = `P${i}`;
        
        // Stochastic demographic assignment
        const ageRoll = Math.random();
        let ageGroup;
        if (ageRoll < 0.25) ageGroup = AgeGroup.CHILD;
        else if (ageRoll < 0.70) ageGroup = AgeGroup.YOUTH;
        else ageGroup = AgeGroup.ELDERLY;

        const gender = Math.random() < 0.5 ? Gender.MALE : Gender.FEMALE;

        // Assign home (clustered by family units)
        const homeIndex = Math.floor(i / Math.ceil(population / homeIds.length)) % homeIds.length;
        const homeId = homeIds[homeIndex];

        // Assign activity building based on age
        let activityId;
        if (ageGroup === AgeGroup.CHILD) {
            // Children go to college/school
            activityId = collegeIds[Math.floor(Math.random() * collegeIds.length)];
        } else if (ageGroup === AgeGroup.YOUTH) {
            // Youth: 60% college, 30% mall, 10% hospital (workers)
            const roll = Math.random();
            if (roll < 0.6) {
                activityId = collegeIds[Math.floor(Math.random() * collegeIds.length)];
            } else if (roll < 0.9) {
                activityId = mallIds[Math.floor(Math.random() * mallIds.length)];
            } else {
                activityId = hospitalIds[Math.floor(Math.random() * hospitalIds.length)];
            }
        } else {
            // Elderly: 40% stay home, 30% mall, 30% hospital
            const roll = Math.random();
            if (roll < 0.4) {
                activityId = homeId;
            } else if (roll < 0.7) {
                activityId = mallIds[Math.floor(Math.random() * mallIds.length)];
            } else {
                activityId = hospitalIds[Math.floor(Math.random() * hospitalIds.length)];
            }
        }

        const person = {
            id,
            ageGroup,
            gender,
            state: State.SUSCEPTIBLE,
            homeId,
            activityId,
            infectedTick: -1,
            recoveredTick: -1,
            infectedBy: null
        };

        people.set(id, person);
        graph.addNode(id);

        // Create bipartite edges: Person <-> Home, Person <-> Activity
        graph.addEdge(id, homeId, 1.0);
        if (activityId !== homeId) {
            graph.addEdge(id, activityId, 0.8);
        }

        // Track occupants in buildings
        buildings.get(homeId).occupants.push(id);
        if (activityId !== homeId && buildings.has(activityId)) {
            buildings.get(activityId).occupants.push(id);
        }
    }

    // Seed initial infections randomly
    const peopleArray = Array.from(people.keys());
    shuffleArray(peopleArray);
    
    for (let i = 0; i < Math.min(initialInfected, population); i++) {
        const person = people.get(peopleArray[i]);
        person.state = State.INFECTED;
        person.infectedTick = 0;
        infectionQueue.enqueue(peopleArray[i]);
    }

    return {
        totalPeople: people.size,
        totalBuildings: buildings.size,
        initialInfected: Math.min(initialInfected, population)
    };
}

/**
 * Get building IDs filtered by type
 */
function getBuildingIdsByType(buildings, type) {
    return Array.from(buildings.entries())
        .filter(([_, b]) => b.type === type)
        .map(([id]) => id);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateNetwork, getBuildingIdsByType, shuffleArray };
}
