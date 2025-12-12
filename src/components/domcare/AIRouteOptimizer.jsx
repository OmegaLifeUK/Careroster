import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation, MapPin, Clock, Zap, Map, ArrowRight, TrendingDown, Calendar, X, Sparkles } from "lucide-react";
import { calculateTravelTime } from "../schedule/TravelTimeCalculator";
import RouteMapView from "./RouteMapView";

/**
 * AI-Powered Route Optimizer for Domiciliary Care
 * - Automatically optimizes routes using nearest neighbor + time window constraints
 * - Real-time recalculation on visit changes
 * - Visual map integration
 * - Multi-objective optimization (time, distance, visit windows)
 */

export default function AIRouteOptimizer({ 
  staff, 
  visits = [], 
  clients = [],
  onApplyOptimization,
  autoOptimize = false 
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Auto-optimize when visits change
  useEffect(() => {
    if (autoOptimize && visits.length > 1 && staff?.address) {
      optimizeRouteAI();
    }
  }, [visits.length, autoOptimize]);

  const calculateRouteStats = (visitSequence, staffAddress) => {
    if (!staffAddress || !visitSequence.length) return { totalDistance: 0, totalTravelTime: 0, violations: [] };

    let totalDistance = 0;
    let totalTravelTime = 0;
    let currentLocation = staffAddress;
    const violations = [];

    visitSequence.forEach((visit, idx) => {
      const client = clients.find(c => c.id === visit.client_id);
      if (client?.address && currentLocation) {
        const travel = calculateTravelTime(currentLocation, client.address, staff?.vehicle_type || 'car');
        totalDistance += travel.distance;
        totalTravelTime += travel.time;

        // Check time window violations
        if (idx > 0) {
          const prevVisit = visitSequence[idx - 1];
          const prevEnd = new Date(prevVisit.scheduled_end);
          const currentStart = new Date(visit.scheduled_start);
          const gapMinutes = (currentStart - prevEnd) / 60000;

          if (travel.time > gapMinutes) {
            violations.push({
              type: 'travel_time',
              between: [prevVisit.client_id, visit.client_id],
              required: travel.time,
              available: gapMinutes
            });
          }
        }

        currentLocation = client.address;
      }
    });

    return { totalDistance, totalTravelTime, violations };
  };

  const optimizeRouteAI = () => {
    setOptimizing(true);

    const staffAddress = staff?.address;
    if (!staffAddress || !visits || visits.length === 0) {
      setOptimizing(false);
      return;
    }

    // AI-Enhanced Nearest Neighbor with Time Windows
    const optimized = [];
    let currentLocation = staffAddress;
    let currentTime = null;
    const remaining = visits.map(v => ({
      ...v,
      client: clients.find(c => c.id === v.client_id)
    })).filter(v => v.client?.address);

    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      remaining.forEach((visit, index) => {
        const travel = calculateTravelTime(currentLocation, visit.client.address, staff?.vehicle_type);
        const visitStart = new Date(visit.scheduled_start);
        
        // Multi-objective scoring
        let score = 0;
        
        // 1. Minimize distance (highest weight)
        score += (10 - travel.distance) * 10;
        
        // 2. Time window compliance
        if (currentTime) {
          const arrivalTime = new Date(currentTime.getTime() + travel.time * 60000);
          const timeDiff = Math.abs(arrivalTime - visitStart) / 60000;
          score += Math.max(0, 100 - timeDiff);
        }
        
        // 3. Visit urgency (morning visits prioritized)
        const hour = visitStart.getHours();
        if (hour < 10) score += 20;
        else if (hour > 18) score -= 10;
        
        // 4. Client priority (if preferred staff)
        if (visit.client.preferred_staff?.includes(staff.id)) {
          score += 15;
        }

        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });

      const nextVisit = remaining.splice(bestIndex, 1)[0];
      optimized.push({
        ...nextVisit,
        sequence_number: optimized.length + 1
      });
      
      currentLocation = nextVisit.client.address;
      currentTime = new Date(nextVisit.scheduled_end);
    }

    const optimizedStats = calculateRouteStats(optimized, staffAddress);
    setOptimizedRoute({ visits: optimized, stats: optimizedStats });
    setOptimizing(false);
  };

  const applyOptimization = () => {
    if (optimizedRoute && onApplyOptimization) {
      onApplyOptimization(optimizedRoute.visits, staff.id);
      setOptimizedRoute(null);
      setCompareMode(false);
    }
  };

  const currentStats = calculateRouteStats(visits, staff?.address);
  const savings = optimizedRoute ? {
    distance: currentStats.totalDistance - optimizedRoute.stats.totalDistance,
    time: currentStats.totalTravelTime - optimizedRoute.stats.totalTravelTime,
    percent: currentStats.totalTravelTime > 0 
      ? Math.round(((currentStats.totalTravelTime - optimizedRoute.stats.totalTravelTime) / currentStats.totalTravelTime) * 100)
      : 0
  } : null;

  if (visits.length < 2) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3">
          <p className="text-xs text-blue-700">Add 2+ visits to enable route optimization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            AI Route Optimizer - {staff.full_name}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowMap(!showMap)}
            variant="outline"
            className="h-7 px-2 text-xs"
          >
            <Map className="w-3 h-3 mr-1" />
            {showMap ? 'Hide' : 'View'} Map
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats Comparison */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            <p className="text-[10px] text-gray-500 mb-1">Current Route</p>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Distance:</span>
                <span className="font-semibold">{currentStats.totalDistance.toFixed(1)} mi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Travel:</span>
                <span className="font-semibold">{currentStats.totalTravelTime} min</span>
              </div>
              {currentStats.violations.length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-[9px] h-4 px-1 w-full justify-center">
                  {currentStats.violations.length} conflicts
                </Badge>
              )}
            </div>
          </div>

          {optimizedRoute ? (
            <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-300">
              <p className="text-[10px] text-emerald-700 mb-1 font-medium">Optimized Route</p>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">Distance:</span>
                  <span className="font-bold text-emerald-800">{optimizedRoute.stats.totalDistance.toFixed(1)} mi</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">Travel:</span>
                  <span className="font-bold text-emerald-800">{optimizedRoute.stats.totalTravelTime} min</span>
                </div>
                {optimizedRoute.stats.violations.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 text-[9px] h-4 px-1 w-full justify-center">
                    {optimizedRoute.stats.violations.length} conflicts
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 flex items-center justify-center">
              <Button
                size="sm"
                onClick={optimizeRouteAI}
                disabled={optimizing}
                className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                {optimizing ? 'Optimizing...' : 'Optimize'}
              </Button>
            </div>
          )}
        </div>

        {/* Savings Display */}
        {savings && savings.time > 0 && (
          <div className="p-2 bg-emerald-100 border border-emerald-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-emerald-700" />
                <span className="text-emerald-800 font-bold text-xs">
                  Save {savings.time} min ({savings.percent}%)
                </span>
              </div>
              <span className="text-emerald-700 text-[10px]">
                -{savings.distance.toFixed(1)} mi
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {optimizedRoute && (
          <div className="flex gap-2">
            <Button
              onClick={applyOptimization}
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
            >
              <Zap className="w-3 h-3 mr-1" />
              Apply Optimized Route
            </Button>
            <Button
              onClick={() => setCompareMode(!compareMode)}
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
            >
              {compareMode ? 'Hide' : 'Compare'}
            </Button>
          </div>
        )}

        {/* Route Comparison View */}
        {compareMode && optimizedRoute && (
          <div className="space-y-2 max-h-48 overflow-y-auto bg-white rounded-lg p-2 border">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold text-gray-700 mb-1">Current</p>
                {visits.map((v, idx) => {
                  const client = clients.find(c => c.id === v.client_id);
                  return (
                    <div key={v.id} className="text-[10px] text-gray-600 mb-0.5">
                      {idx + 1}. {client?.full_name}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700 mb-1">Optimized</p>
                {optimizedRoute.visits.map((v, idx) => {
                  const client = clients.find(c => c.id === v.client_id);
                  const moved = visits[idx]?.id !== v.id;
                  return (
                    <div key={v.id} className={`text-[10px] mb-0.5 ${moved ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>
                      {idx + 1}. {client?.full_name}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Map View */}
        {showMap && (
          <RouteMapView
            staff={staff}
            currentRoute={visits}
            optimizedRoute={optimizedRoute?.visits}
            clients={clients}
            onClose={() => setShowMap(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}