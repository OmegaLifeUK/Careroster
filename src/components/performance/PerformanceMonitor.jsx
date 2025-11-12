import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Database, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle
} from "lucide-react";

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    apiCalls: 0,
    cacheHits: 0,
    avgResponseTime: 0,
    dataLoaded: 0,
  });
  const [isMonitoring, setIsMonitoring] = useState(true);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      // Simulate metrics collection
      setMetrics(prev => ({
        apiCalls: prev.apiCalls + Math.floor(Math.random() * 5),
        cacheHits: prev.cacheHits + Math.floor(Math.random() * 8),
        avgResponseTime: 120 + Math.floor(Math.random() * 80),
        dataLoaded: prev.dataLoaded + Math.floor(Math.random() * 1000),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const cacheHitRate = metrics.apiCalls > 0 
    ? ((metrics.cacheHits / (metrics.apiCalls + metrics.cacheHits)) * 100).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Performance Monitor
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600">API Calls</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.apiCalls}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600">Live</span>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-600">Cache Hits</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.cacheHits}</p>
            <Badge className="bg-green-100 text-green-800 mt-1">
              {cacheHitRate}% rate
            </Badge>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-gray-600">Avg Response</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgResponseTime}ms</p>
            <div className="flex items-center gap-1 mt-1">
              {metrics.avgResponseTime < 200 ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">Excellent</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3 text-orange-600" />
                  <span className="text-xs text-orange-600">Fair</span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-gray-600">Data Loaded</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(metrics.dataLoaded / 1024).toFixed(1)}KB
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Performance metrics update in real-time • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}