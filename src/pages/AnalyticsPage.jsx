import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Calendar, 
  Download,
  RefreshCw
} from "lucide-react";
import AnalyticsDashboard from "../components/analytics/AnalyticsDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState(30);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: shifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: carers = [], isLoading: carersLoading } = useQuery({
    queryKey: ['carers'],
    queryFn: () => base44.entities.Carer.list(),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchShifts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const isLoading = shiftsLoading || carersLoading || clientsLoading;

  const timeRangeOptions = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Analytics & Insights
            </h1>
            <p className="text-gray-500">
              Comprehensive analysis of your care operations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 mr-2">Time Range:</span>
              {timeRangeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={timeRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Badge variant="secondary" className="ml-auto">
                Last updated: {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Dashboard */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-64" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <AnalyticsDashboard
            shifts={shifts}
            carers={carers}
            clients={clients}
            timeRange={timeRange}
          />
        )}
      </div>
    </div>
  );
}