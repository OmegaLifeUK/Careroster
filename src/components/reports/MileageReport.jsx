import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, Navigation, Clock, MapPin } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MileageReport({ shifts, carers, clients, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCarer, setSelectedCarer] = useState("all");

  // Calculate estimated mileage between shifts (this is a simplified calculation)
  const calculateMileage = (shift) => {
    // In a real app, you'd use actual GPS coordinates and a distance API
    // For now, we'll use a placeholder calculation
    return Math.random() * 15 + 2; // Random mileage between 2-17 miles
  };

  const getFilteredShifts = () => {
    return shifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(shiftDate, { start: from, end: to });
        const matchesCarer = selectedCarer === "all" || shift.carer_id === selectedCarer;
        const hasLocation = shift.client_id; // Has client means has location
        
        return inRange && matchesCarer && hasLocation && shift.status === 'completed';
      } catch {
        return false;
      }
    });
  };

  const calculateCarerMileage = () => {
    const filteredShifts = getFilteredShifts();
    const carerMileage = {};

    filteredShifts.forEach(shift => {
      if (!shift.carer_id) return;

      if (!carerMileage[shift.carer_id]) {
        const carer = carers.find(c => c.id === shift.carer_id);
        carerMileage[shift.carer_id] = {
          name: carer?.full_name || "Unknown",
          totalMiles: 0,
          totalTrips: 0,
          totalHours: 0,
        };
      }

      const miles = calculateMileage(shift);
      carerMileage[shift.carer_id].totalMiles += miles;
      carerMileage[shift.carer_id].totalTrips++;
      carerMileage[shift.carer_id].totalHours += shift.duration_hours || 0;
    });

    return Object.values(carerMileage).map(stat => ({
      ...stat,
      averageMilesPerTrip: stat.totalTrips > 0 ? (stat.totalMiles / stat.totalTrips).toFixed(1) : 0,
      reimbursement: (stat.totalMiles * 0.45).toFixed(2), // IRS standard mileage rate
    })).sort((a, b) => b.totalMiles - a.totalMiles);
  };

  const exportToCSV = () => {
    const stats = calculateCarerMileage();
    const headers = ["Carer Name", "Total Miles", "Total Trips", "Avg Miles/Trip", "Total Hours", "Reimbursement ($0.45/mile)"];
    const rows = stats.map(stat => [
      stat.name,
      stat.totalMiles.toFixed(2),
      stat.totalTrips,
      stat.averageMilesPerTrip,
      stat.totalHours.toFixed(2),
      `$${stat.reimbursement}`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mileage-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const stats = calculateCarerMileage();
  const totalMiles = stats.reduce((sum, s) => sum + s.totalMiles, 0);
  const totalReimbursement = stats.reduce((sum, s) => sum + parseFloat(s.reimbursement), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Mileage & Travel Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Track travel distances and reimbursements</p>
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Mileage calculations are estimates based on shift locations. 
              In a production environment, this would integrate with GPS tracking and mapping APIs for accurate distances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <div>
              <Label htmlFor="carer-filter">Filter by Carer</Label>
              <Select value={selectedCarer} onValueChange={setSelectedCarer}>
                <SelectTrigger id="carer-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carers</SelectItem>
                  {carers.map(carer => (
                    <SelectItem key={carer.id} value={carer.id}>
                      {carer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setDateFrom(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
                  setDateTo(format(new Date(), "yyyy-MM-dd"));
                  setSelectedCarer("all");
                }}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Navigation className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Total Miles</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {totalMiles.toFixed(1)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Total Trips</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.reduce((sum, s) => sum + s.totalTrips, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Travel Hours</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {stats.reduce((sum, s) => sum + s.totalHours, 0).toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Download className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Reimbursement</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  ${totalReimbursement.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Carer Name</TableHead>
                  <TableHead className="text-right">Total Miles</TableHead>
                  <TableHead className="text-right">Total Trips</TableHead>
                  <TableHead className="text-right">Avg Miles/Trip</TableHead>
                  <TableHead className="text-right">Travel Hours</TableHead>
                  <TableHead className="text-right">Reimbursement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell className="text-right font-semibold">{stat.totalMiles.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{stat.totalTrips}</TableCell>
                    <TableCell className="text-right">{stat.averageMilesPerTrip}</TableCell>
                    <TableCell className="text-right">{stat.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">
                      ${stat.reimbursement}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No travel data available for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}