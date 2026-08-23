/**
 * ESPER Tactical Geospatial Engine - SVG Tactical Vector Icon Generator
 * Pure SVG vector icons for DOM markers and popups.
 * STRICT RULE: ZERO EMOJIS.
 */

export const TACTICAL_SVG_ICONS = {
  // Fire / Thermal Incident
  FIRE: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>`,

  // Gunfire / Active Threat / Crosshair
  CROSSHAIR: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/></svg>`,

  // Alert / Warning / High Threat
  ALERT: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,

  // Medical / First Responder Cross
  MEDICAL: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`,

  // CCTV / Surveillance Camera
  CAMERA: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,

  // Tactical UAS / Drone
  DRONE: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>`,

  // Rogue / Hostile Intrusion Shield
  HOSTILE: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,

  // Airspace Radar / RF Sensor
  RADAR: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4.93 4.93a10 10 0 0 1 14.14 0"/><path d="M7.76 7.76a6 6 0 0 1 8.48 0"/><circle cx="12" cy="12" r="2"/></svg>`,

  // Patrol / Police Shield
  POLICE: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,

  // Air Support Helicopter / Aviation Compass
  AIR_SUPPORT: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,

  // Target / Location Pin
  PIN: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
};

/**
 * Returns color and SVG icon for any incident type
 */
export function getIncidentTacticalIcon(incidentType = '') {
  const type = incidentType.toLowerCase();

  if (type.includes('fire') || type.includes('explosion')) {
    return {
      svg: TACTICAL_SVG_ICONS.FIRE,
      color: '#ef4444',
      label: 'FIRE'
    };
  }
  if (
    type.includes('shot') ||
    type.includes('gunfire') ||
    type.includes('robbery') ||
    type.includes('swat')
  ) {
    return {
      svg: TACTICAL_SVG_ICONS.CROSSHAIR,
      color: '#f97316',
      label: 'THREAT'
    };
  }
  if (type.includes('drone') || type.includes('uav')) {
    return {
      svg: TACTICAL_SVG_ICONS.DRONE,
      color: '#a855f7',
      label: 'AIRSPACE'
    };
  }
  if (type.includes('medical') || type.includes('rescue')) {
    return {
      svg: TACTICAL_SVG_ICONS.MEDICAL,
      color: '#10b981',
      label: 'EMS'
    };
  }
  if (type.includes('traffic') || type.includes('collision')) {
    return {
      svg: TACTICAL_SVG_ICONS.ALERT,
      color: '#eab308',
      label: 'TRAFFIC'
    };
  }

  return {
    svg: TACTICAL_SVG_ICONS.ALERT,
    color: '#ef4444',
    label: 'ALERT'
  };
}

/**
 * Returns color and SVG icon for any unit type
 */
export function getUnitTacticalIcon(unitType = '') {
  const type = unitType.toUpperCase();

  if (type.includes('FIRE')) {
    return {
      svg: TACTICAL_SVG_ICONS.FIRE,
      color: '#ef4444'
    };
  }
  if (type.includes('RESCUE') || type.includes('AMBULANCE')) {
    return {
      svg: TACTICAL_SVG_ICONS.MEDICAL,
      color: '#10b981'
    };
  }
  if (type.includes('AIR') || type.includes('HELI')) {
    return {
      svg: TACTICAL_SVG_ICONS.AIR_SUPPORT,
      color: '#eab308'
    };
  }
  return {
    svg: TACTICAL_SVG_ICONS.POLICE,
    color: '#3b82f6'
  };
}
