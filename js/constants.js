/* ============================================================
   CONSTANTS MODULE
   Type definitions, enums, and configuration constants
   ============================================================ */

// Age Groups
const AgeGroup = Object.freeze({
    CHILD: 'Child',
    YOUTH: 'Youth',
    ELDERLY: 'Elderly'
});

// Gender
const Gender = Object.freeze({
    MALE: 'M',
    FEMALE: 'F'
});

// Disease States (SIR Model)
const State = Object.freeze({
    SUSCEPTIBLE: 'S',
    INFECTED: 'I',
    RECOVERED: 'R'
});

// Building Types with distinct shapes
const BuildingType = Object.freeze({
    HOME: 'Home',           // Hexagon
    COLLEGE: 'College',     // Circle
    MALL: 'Mall',           // Square
    HOSPITAL: 'Hospital'    // Cross/Plus
});

// Lockdown Levels
const LockdownLevel = Object.freeze({
    NONE: { id: 0, name: 'No Lockdown', reduction: 0, description: 'Normal activity' },
    LEVEL_1: { id: 1, name: 'Level 1', reduction: 0.4, description: '40% contact reduction' },
    LEVEL_2: { id: 2, name: 'Level 2', reduction: 0.7, description: '70% contact reduction' },
    LEVEL_3: { id: 3, name: 'Level 3', reduction: 0.9, description: '90% contact reduction' }
});

// Age-based risk factors for transmission
const AGE_FACTORS = Object.freeze({
    [AgeGroup.CHILD]: 1.2,    // Higher contact rate
    [AgeGroup.YOUTH]: 1.0,    // Baseline
    [AgeGroup.ELDERLY]: 1.5   // Higher susceptibility
});

// Visual sizes for age groups (smaller for better visualization)
const AGE_SIZES = Object.freeze({
    [AgeGroup.CHILD]: 2,
    [AgeGroup.YOUTH]: 3,
    [AgeGroup.ELDERLY]: 4
});

// Building sizes
const BUILDING_SIZES = Object.freeze({
    [BuildingType.HOME]: 12,
    [BuildingType.COLLEGE]: 14,
    [BuildingType.MALL]: 12,
    [BuildingType.HOSPITAL]: 11
});

// Colors - Black and Blue theme
const COLORS = Object.freeze({
    susceptible: '#4a5568',
    infected: '#ef4444',
    recovered: '#10b981',
    male: '#3b82f6',
    female: '#f472b6',
    child: '#60a5fa',
    youth: '#3b82f6',
    elderly: '#1d4ed8',
    home: '#2563eb',
    college: '#3b82f6',
    mall: '#60a5fa',
    hospital: '#1e40af',
    accent: '#3b82f6',
    accentLight: '#60a5fa',
    accentDark: '#1e40af'
});

// Building distribution ratios
const BUILDING_RATIOS = Object.freeze({
    [BuildingType.HOME]: 0.50,      // 50% homes
    [BuildingType.COLLEGE]: 0.20,   // 20% colleges
    [BuildingType.MALL]: 0.15,      // 15% malls
    [BuildingType.HOSPITAL]: 0.15   // 15% hospitals
});

// Default simulation parameters
const DEFAULT_PARAMS = Object.freeze({
    population: 1000,
    buildings: 30,
    initialInfected: 5,
    transmissionRate: 0.15,
    recoveryRate: 0.10,
    lockdownLevel: LockdownLevel.NONE,
    simulationSpeed: 150
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AgeGroup, Gender, State, BuildingType, LockdownLevel,
        AGE_FACTORS, AGE_SIZES, COLORS, BUILDING_RATIOS, DEFAULT_PARAMS
    };
}
