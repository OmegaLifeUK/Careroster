import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Calendar, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function ShiftFillRateReport({ shifts, carers, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const getFilteredShifts = () => {
    return shifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        return isWithinInterval(shiftDate, { start: from, end: to });
      } catch {
        return false;
      }
    });
  };

  const calculateFillRate = () => {
    const filteredShifts = getFilteredShifts();
    const totalShifts = filteredShifts.length;
    const filledShifts = filteredShifts.filter(s => s.carer_id && s.status !== 'unfilled').length;
    const unfilledShifts = filteredShifts.filter(s => s.status === 'unfilled' || !s.carer_id).length;
    const completedShifts = filteredShifts.filter(s => s.status === 'completed').length;
    const cancelledShifts = filteredShifts.filter(s => s.status === 'cancelled').length;

    return {
      totalShifts,
      filledShifts,
      unfilledShifts,
      completedShifts,
      cancelledShifts,
      fillRate: totalShifts > 0 ? ((filledShifts / totalShifts) * 100).toFixed(1) : 0,
      completionRate: totalShifts > 0 ? ((completedShifts / totalShifts) * 100).toFixed(1) : 0,
    };
  };

  const getUnfilledShiftsByType = () => {
    const filteredShifts = getFilteredShifts();
    const unfilledShifts = filteredShifts.filter(s => s.status === 'unfilled' || !s.carer_id);
    
    const byType = {};
    unfilledShifts.forEach(shift => {
      const type = shift.shift_type || 'unknown';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(shift);
    });

    return Object.entries(byType).map(([type, shifts]) => ({
      type: type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      count: shifts.length,
      percentage: ((shifts.length / unfilledShifts.length) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);
  };

  const getUnfilledShiftDetails = () => {
    const filteredShifts = getFilteredShifts();
    return filteredShifts
      .filter(s => s.status === 'unfilled' || !s.carer_id)
      .map(shift => {
        const client = clients.find(c => c.id === shift.client_id);
        return {
          ...shift,
          clientName: client?.full_name || 'Unknown',
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const exportToCSV = () => {
    const stats = calculateFillRate();
    const unfilledDetails = getUnfilledShiftDetails();
    
    const summaryHeaders = ["Metric", "Value"];
    const summaryRows = [
      ["Total Shifts", stats.totalShifts],
      ["Filled Shifts", stats.filledShifts],
      ["Unfilled Shifts", stats.unfilledShifts],
      ["Completed Shifts", stats.completedShifts],
      ["Cancelled Shifts", stats.cancelledShifts],
      ["Fill Rate", `${stats.fillRate}%`],
      ["Completion Rate", `${stats.completionRate}%`],
    ];

    const detailHeaders = ["Date", "Time", "Client", "Shift Type", "Status"];
    const detailRows = unfilledDetails.map(shift => [
      shift.date,
      `${shift.start_time}-${shift.end_time}`,
      shift.clientName,
      shift.shift_type,
      shift.status
    ]);

    const csvContent = [
      "SHIFT FILL RATE SUMMARY",
      summaryHeaders.join(","),
      ...summaryRows.map(row => row.join(",")),
      "",
      "UNFILLED SHIFTS DETAILS",
      detailHeaders.join(","),
      ...detailRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shift-fill-rate-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateFillRate();
  const unfilledByType = getUnfilledShiftsByType();
  const unfilledDetails = getUnfilledShiftDetails();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Shift Fill Rate Analysis
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Analyze shift coverage and gaps</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setDateFrom(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
                  setDateTo(format(new Date(), "yyyy-MM-dd"));
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Fill Rate</p>
                    <p className="text-4xl font-bold text-blue-900">{stats.fillRate}%</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-blue-600" />
                </div>
                <Progress value={parseFloat(stats.fillRate)} className="h-2 mb-2" />
                <p className="text-xs text-blue-700">
                  {stats.filledShifts} of {stats.totalShifts} shifts filled
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-orange-900 mb-1">Unfilled Shifts</p>
                    <p className="text-4xl font-bold text-orange-900">{stats.unfilledShifts}</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-orange-600" />
                </div>
                <p className="text-xs text-orange-700">
                  Requires immediate attention
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Total Shifts</p>
                <p className="text-2xl font-bold">{stats.totalShifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Filled Shifts</p>
                <p className="text-2xl font-bold text-green-600">{stats.filledShifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completedShifts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelledShifts}</p>
              </CardContent>
            </Card>
          </div>

          {unfilledByType.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Unfilled Shifts by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unfilledByType.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{item.type}</span>
                          <span className="text-sm text-gray-600">{item.count} shifts ({item.percentage}%)</span>
                        </div>
                        <Progress value={parseFloat(item.percentage)} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {unfilledDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unfilled Shift Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unfilledDetails.slice(0, 10).map((shift, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-orange-900">{shift.clientName}</p>
                          <p className="text-sm text-orange-700">
                            {format(parseISO(shift.date), "EEE, MMM d, yyyy")} • {shift.start_time} - {shift.end_time}
                          </p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {shift.shift_type}
                          </Badge>
                        </div>
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                    </div>
                  ))}
                  {unfilledDetails.length > 10 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      +{unfilledDetails.length - 10} more unfilled shifts
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}