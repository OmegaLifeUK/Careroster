import { calculateTravelTime } from "./TravelTimeCalculator";

/**
 * AI-Powered Route Optimizer using nearest neighbor heuristic with 2-opt improvement
 * Calculates the most efficient visiting order to minimize total travel time
 */

export function optimizeRoute(visits, staffMember, clients) {
  if (!visits || visits.length <= 1) {
    return {
      optimizedVisits: visits,
      totalTravelTime: 0,
      totalDistance: 0,
      savings: 0
    };
  }

  // Sort visits by scheduled start time first (to respect time constraints)
  const sortedByTime = [...visits].sort((a, b) => 
    a.scheduled_start.localeCompare(b.scheduled_start)
  );

  // Get client addresses
  const visitsWithClients = sortedByTime.map(v => ({
    ...v,
    client: clients.find(c => c.id === v.client_id)
  }));

  // Calculate original route metrics
  const originalMetrics = calculateRouteMetrics(visitsWithClients, staffMember);

  // Apply nearest neighbor with time windows
  const optimized = nearestNeighborWithTimeWindows(visitsWithClients, staffMember);

  // Apply 2-opt improvement
  const improved = twoOptImprovement(optimized, staffMember);

  // Calculate optimized metrics
  const optimizedMetrics = calculateRouteMetrics(improved, staffMember);

  return {
    optimizedVisits: improved,
    totalTravelTime: optimizedMetrics.travelTime,
    totalDistance: optimizedMetrics.distance,
    originalTravelTime: originalMetrics.travelTime,
    savings: originalMetrics.travelTime - optimizedMetrics.travelTime,
    savingsPercent: originalMetrics.travelTime > 0 
      ? Math.round(((originalMetrics.travelTime - optimizedMetrics.travelTime) / originalMetrics.travelTime) * 100)
      : 0
  };
}

function calculateRouteMetrics(visits, staffMember) {
  let totalTravelTime = 0;
  let totalDistance = 0;

  for (let i = 0; i < visits.length - 1; i++) {
    const current = visits[i];
    const next = visits[i + 1];

    if (current.client?.address && next.client?.address) {
      const travel = calculateTravelTime(
        current.client.address,
        next.client.address,
        staffMember.vehicle_type || 'car'
      );
      totalTravelTime += travel.time;
      totalDistance += travel.distance;
    }
  }

  return { travelTime: totalTravelTime, distance: totalDistance };
}

function nearestNeighborWithTimeWindows(visits, staffMember) {
  if (visits.length <= 2) return visits;

  const result = [visits[0]]; // Start with first visit
  const remaining = visits.slice(1);

  while (remaining.length > 0) {
    const current = result[result.length - 1];
    let bestIdx = -1;
    let bestScore = Infinity;

    remaining.forEach((candidate, idx) => {
      // Calculate score: weighted combination of distance and time constraint
      const travel = calculateTravelTime(
        current.client?.address || {},
        candidate.client?.address || {},
        staffMember.vehicle_type || 'car'
      );

      // Time feasibility check
      const currentEnd = new Date(current.scheduled_end);
      const candidateStart = new Date(candidate.scheduled_start);
      const travelTimeMs = travel.time * 60 * 1000;
      const arrivalTime = new Date(currentEnd.getTime() + travelTimeMs);

      // Penalize if we'd arrive late
      const latePenalty = arrivalTime > candidateStart ? 
        (arrivalTime - candidateStart) / (60 * 1000) : 0;

      const score = travel.time + (latePenalty * 10); // Heavy penalty for being late

      if (score < bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    if (bestIdx !== -1) {
      result.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }
  }

  return result;
}

function twoOptImprovement(visits, staffMember) {
  if (visits.length <= 3) return visits;

  let route = [...visits];
  let improved = true;

  while (improved) {
    improved = false;

    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        // Try reversing segment between i and j
        const newRoute = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1)
        ];

        const currentCost = calculateRouteMetrics(route, staffMember).travelTime;
        const newCost = calculateRouteMetrics(newRoute, staffMember).travelTime;

        if (newCost < currentCost && isTimeFeasible(newRoute)) {
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

function isTimeFeasible(visits) {
  for (let i = 0; i < visits.length - 1; i++) {
    const current = visits[i];
    const next = visits[i + 1];

    const currentEnd = new Date(current.scheduled_end);
    const nextStart = new Date(next.scheduled_start);

    if (currentEnd >= nextStart) {
      return false; // Overlap or impossible timing
    }
  }
  return true;
}

export function calculateRouteCoordinates(visits, clients) {
  return visits
    .map(v => {
      const client = clients.find(c => c.id === v.client_id);
      if (!client?.address?.latitude || !client?.address?.longitude) {
        return null;
      }
      return {
        lat: client.address.latitude,
        lng: client.address.longitude,
        clientName: client.full_name,
        visitTime: v.scheduled_start,
        address: client.address
      };
    })
    .filter(Boolean);
}