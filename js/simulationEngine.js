/* ============================================================
   SIMULATION ENGINE MODULE
   SIR Model with stochastic transmission and lockdown support
   ============================================================ */

/**
 * Main simulation tick function
 * Implements stochastic SIR model with building-based proximity
 * Risk = p × AgeFactor × (1 - LockdownReduction)
 */
function simulationTick(state) {
    const {
        people,
        buildings,
        infectionQueue,
        pathTracker,
        transmissionRate,
        recoveryRate,
        lockdownLevel,
        currentTick
    } = state;

    const newInfections = [];
    const newRecoveries = [];
    const lockdownReduction = lockdownLevel.reduction || 0;

    // Process infections using the infection queue
    // O(I × avg_contacts) instead of O(N²)
    const currentInfected = infectionQueue.getAll();

    for (const infectedId of currentInfected) {
        const infectedPerson = people.get(infectedId);
        if (!infectedPerson || infectedPerson.state !== State.INFECTED) continue;

        // Check for recovery
        if (Math.random() < recoveryRate) {
            newRecoveries.push(infectedId);
            continue;
        }

        // Get buildings this person visits
        const visitedBuildings = [infectedPerson.homeId];
        if (infectedPerson.activityId !== infectedPerson.homeId) {
            // During lockdown, reduced chance of visiting activity location
            if (Math.random() > lockdownReduction) {
                visitedBuildings.push(infectedPerson.activityId);
            }
        }

        // Spread infection within buildings (physical proximity model)
        for (const buildingId of visitedBuildings) {
            const building = buildings.get(buildingId);
            if (!building) continue;

            // Sample occupants for large buildings (optimization for 5000+ nodes)
            let occupantsToCheck = building.occupants;
            if (occupantsToCheck.length > 50) {
                occupantsToCheck = sampleArray(occupantsToCheck, 50);
            }

            for (const occupantId of occupantsToCheck) {
                if (occupantId === infectedId) continue;

                const occupant = people.get(occupantId);
                if (!occupant || occupant.state !== State.SUSCEPTIBLE) continue;

                // Apply lockdown effect (reduces contact probability)
                if (Math.random() < lockdownReduction) continue;

                // Calculate transmission risk: Risk = p × AgeFactor
                const ageFactor = AGE_FACTORS[occupant.ageGroup];
                const risk = transmissionRate * ageFactor;

                if (Math.random() < risk) {
                    newInfections.push({ id: occupantId, infectedBy: infectedId });
                }
            }
        }
    }

    // Apply state changes (deferred to avoid modifying during iteration)
    for (const id of newRecoveries) {
        const person = people.get(id);
        person.state = State.RECOVERED;
        person.recoveredTick = currentTick;
        infectionQueue.remove(id);
    }

    for (const { id, infectedBy } of newInfections) {
        const person = people.get(id);
        if (person.state === State.SUSCEPTIBLE) {
            person.state = State.INFECTED;
            person.infectedTick = currentTick;
            person.infectedBy = infectedBy;
            infectionQueue.enqueue(id);
            pathTracker.addPath(infectedBy, id, currentTick);
        }
    }

    return {
        newInfections: newInfections.length,
        newRecoveries: newRecoveries.length,
        totalInfected: infectionQueue.size
    };
}

/**
 * Calculate current statistics
 */
function calculateStats(people) {
    let s = 0, i = 0, r = 0;
    const byAge = {
        [AgeGroup.CHILD]: { s: 0, i: 0, r: 0 },
        [AgeGroup.YOUTH]: { s: 0, i: 0, r: 0 },
        [AgeGroup.ELDERLY]: { s: 0, i: 0, r: 0 }
    };
    const byGender = {
        [Gender.MALE]: { s: 0, i: 0, r: 0 },
        [Gender.FEMALE]: { s: 0, i: 0, r: 0 }
    };

    for (const person of people.values()) {
        const stateKey = person.state === State.SUSCEPTIBLE ? 's' :
                        person.state === State.INFECTED ? 'i' : 'r';
        
        if (person.state === State.SUSCEPTIBLE) s++;
        else if (person.state === State.INFECTED) i++;
        else r++;

        byAge[person.ageGroup][stateKey]++;
        byGender[person.gender][stateKey]++;
    }

    return { s, i, r, byAge, byGender, total: people.size };
}

/**
 * Sample random elements from array (for optimization)
 */
function sampleArray(array, n) {
    if (array.length <= n) return array;
    const result = [];
    const taken = new Set();
    while (result.length < n) {
        const idx = Math.floor(Math.random() * array.length);
        if (!taken.has(idx)) {
            taken.add(idx);
            result.push(array[idx]);
        }
    }
    return result;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { simulationTick, calculateStats, sampleArray };
}
