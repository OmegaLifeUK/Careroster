import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Clock, Zap, Map, ArrowRight } from "lucide-react";
import { calculateTravelTime } from "./TravelTimeCalculator";

/**
 * Route Optimizer Component
 * Optimizes visit sequences to minimize travel time and distance
 * Provides visual route planning for domiciliary care runs
 */

export default function RouteOptimizer({ visits, staff, onApplyOptimization }) {
  const [optimizing, setOptimizing] = useState(false);

  const calculateRouteStats = (visitSequence, staffAddress) => {
    let totalDistance = 0;
    let totalTravelTime = 0;
    let currentLocation = staffAddress;

    visitSequence.forEach(visit => {
      if (visit.client?.address && currentLocation) {
        const travel = calculateTravelTime(currentLocation, visit.client.address, staff?.vehicle_type || 'car');
        totalDistance += travel.distance;
        totalTravelTime += travel.time;
        currentLocation = visit.client.address;
      }
    });

    return { totalDistance, totalTravelTime };
  };

  const optimizeRoute = () => {
    setOptimizing(true);

    // Nearest neighbor algorithm for route optimization
    const staffAddress = staff?.address;
    if (!staffAddress || !visits || visits.length === 0) {
      setOptimizing(false);
      return;
    }

    const optimized = [];
    let currentLocation = staffAddress;
    const remaining = [...visits];

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      remaining.forEach((visit, index) => {
        if (!visit.client?.address) return;
        const travel = calculateTravelTime(currentLocation, visit.client.address, staff?.vehicle_type);
        if (travel.distance < nearestDistance) {
          nearestDistance = travel.distance;
          nearestIndex = index;
        }
      });

      const nextVisit = remaining.splice(nearestIndex, 1)[0];
      optimized.push({
        ...nextVisit,
        sequence_number: optimized.length + 1
      });
      currentLocation = nextVisit.client?.address || currentLocation;
    }

    setOptimizing(false);
    onApplyOptimization?.(optimized);
  };

  const currentStats = calculateRouteStats(visits, staff?.address);
  
  // Calculate optimized stats
  let optimizedSequence = [];
  if (staff?.address && visits.length > 0) {
    let currentLocation = staff.address;
    const remaining = [...visits];
    
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      remaining.forEach((visit, index) => {
        if (!visit.client?.address) return;
        const travel = calculateTravelTime(currentLocation, visit.client.address);
        if (travel.distance < nearestDistance) {
          nearestDistance = travel.distance;
          nearestIndex = index;
        }
      });

      const nextVisit = remaining.splice(nearestIndex, 1)[0];
      optimizedSequence.push(nextVisit);
      currentLocation = nextVisit.client?.address || currentLocation;
    }
  }
  
  const optimizedStats = calculateRouteStats(optimizedSequence, staff?.address);
  const savings = {
    distance: currentStats.totalDistance - optimizedStats.totalDistance,
    time: currentStats.totalTravelTime - optimizedStats.totalTravelTime
  };

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-sm">Route Optimization</h3>
        </div>
        <Button
          size="sm"
          onClick={optimizeRoute}
          disabled={optimizing || visits.length < 2}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Optimize Route
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white rounded-lg p-2.5 border">
          <p className="text-gray-500 mb-1">Current Route</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Distance:</span>
              <span className="font-semibold">{currentStats.totalDistance.toFixed(1)} mi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Travel Time:</span>
              <span className="font-semibold">{currentStats.totalTravelTime} min</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-2.5 border border-green-200">
          <p className="text-green-700 mb-1 font-medium">Optimized Route</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-green-700">Distance:</span>
              <span className="font-bold text-green-800">{optimizedStats.totalDistance.toFixed(1)} mi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-700">Travel Time:</span>
              <span className="font-bold text-green-800">{optimizedStats.totalTravelTime} min</span>
            </div>
          </div>
        </div>
      </div>

      {savings.time > 0 && (
        <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded-lg text-center">
          <p className="text-green-800 font-semibold text-xs">
            Save {savings.time} min & {savings.distance.toFixed(1)} miles
          </p>
        </div>
      )}
    </div>
  );
}