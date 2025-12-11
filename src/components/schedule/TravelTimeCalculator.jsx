import React from "react";
import { MapPin, Navigation, Clock, Car, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Travel Time Calculator and Display Component
 * Calculates and displays travel times, distances, and modes of transport
 * Used across all care settings for schedule optimization
 */

export function calculateTravelTime(fromAddress, toAddress, transportMode = 'car') {
  // Simplified calculation - in production would use Google Maps API
  // For now, estimate based on straight-line distance
  if (!fromAddress?.latitude || !fromAddress?.longitude || 
      !toAddress?.latitude || !toAddress?.longitude) {
    return { distance: 0, time: 0 };
  }

  // Calculate distance using Haversine formula
  const R = 3959; // Earth's radius in miles
  const lat1 = fromAddress.latitude * Math.PI / 180;
  const lat2 = toAddress.latitude * Math.PI / 180;
  const deltaLat = (toAddress.latitude - fromAddress.latitude) * Math.PI / 180;
  const deltaLon = (toAddress.longitude - fromAddress.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  // Calculate time based on transport mode
  const speeds = {
    car: 30, // mph average in urban areas
    bike: 12,
    public_transport: 15,
    walking: 3
  };

  const speed = speeds[transportMode] || speeds.car;
  const time = (distance / speed) * 60; // Convert to minutes

  return {
    distance: Math.round(distance * 10) / 10,
    time: Math.ceil(time)
  };
}

export function TravelTimeBadge({ fromAddress, toAddress, transportMode = 'car', showDetails = false }) {
  const travel = calculateTravelTime(fromAddress, toAddress, transportMode);

  if (travel.time === 0) return null;

  const icons = {
    car: Car,
    bike: Navigation,
    public_transport: Navigation,
    walking: Navigation
  };

  const Icon = icons[transportMode] || Car;

  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Icon className="w-3 h-3 mr-1" />
      {travel.time}min
      {showDetails && ` (${travel.distance}mi)`}
    </Badge>
  );
}

export function TravelWarning({ totalTravelTime, maxRecommended = 120 }) {
  if (totalTravelTime <= maxRecommended) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
      <AlertTriangle className="w-4 h-4 text-orange-600" />
      <span className="text-orange-800">
        Excessive travel time: {totalTravelTime}min ({Math.round(totalTravelTime / 60)}h)
      </span>
    </div>
  );
}

export function optimizeVisitSequence(visits, staffAddress) {
  // Optimize visit order to minimize travel time
  if (!visits || visits.length === 0) return visits;

  const optimized = [...visits];
  let currentLocation = staffAddress;
  const remaining = [...visits];
  const sequence = [];

  while (remaining.length > 0) {
    // Find nearest next visit
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((visit, index) => {
      const client = visit.client;
      if (!client?.address) return;

      const travel = calculateTravelTime(currentLocation, client.address);
      if (travel.distance < nearestDistance) {
        nearestDistance = travel.distance;
        nearestIndex = index;
      }
    });

    const nextVisit = remaining.splice(nearestIndex, 1)[0];
    sequence.push(nextVisit);
    currentLocation = nextVisit.client?.address || currentLocation;
  }

  return sequence;
}