import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, DollarSign, Clock, TrendingUp, FileText } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PayrollReport({ shifts, carers, isLoading }) {
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCarer, setSelectedCarer] = useState("all");

  const getFilteredShifts = () => {
    return shifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        const from = parseISO(dateFrom);
        const to = parseISO(dateTo);
        
        const inRange = isWithinInterval(shiftDate, { start: from, end: to });
        const matchesCarer = selectedCarer === "all" || shift.carer_id === selectedCarer;
        const isCompleted = shift.status === 'completed';
        
        return inRange && matchesCarer && isCompleted;
      } catch {
        return false;
      }
    });
  };

  const calculatePayroll = () => {
    const filteredShifts = getFilteredShifts();
    const payrollData = {};

    filteredShifts.forEach(shift => {
      if (!shift.carer_id) return;

      const carer = carers.find(c => c.id === shift.carer_id);
      if (!carer) return;

      if (!payrollData[shift.carer_id]) {
        payrollData[shift.carer_id] = {
          name: carer.full_name || "Unknown",
          hourlyRate: carer.hourly_rate || 15, // Default rate if not set
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          totalShifts: 0,
        };
      }

      const hours = shift.duration_hours || 0;
      payrollData[shift.carer_id].totalHours += hours;
      payrollData[shift.carer_id].totalShifts++;

      // Simple overtime calculation: >40 hours per week
      // In a real system, this would be more sophisticated
      if (payrollData[shift.carer_id].regularHours < 40) {
        const regularToAdd = Math.min(hours, 40 - payrollData[shift.carer_id].regularHours);
        payrollData[shift.carer_id].regularHours += regularToAdd;
        payrollData[shift.carer_id].overtimeHours += Math.max(0, hours - regularToAdd);
      } else {
        payrollData[shift.carer_id].overtimeHours += hours;
      }
    });

    return Object.values(payrollData).map(data => {
      const regularPay = data.regularHours * data.hourlyRate;
      const overtimePay = data.overtimeHours * data.hourlyRate * 1.5; // Time and a half
      const grossPay = regularPay + overtimePay;
      const taxes = grossPay * 0.22; // Simplified 22% tax rate
      const netPay = grossPay - taxes;

      return {
        ...data,
        regularPay: regularPay.toFixed(2),
        overtimePay: overtimePay.toFixed(2),
        grossPay: grossPay.toFixed(2),
        taxes: taxes.toFixed(2),
        netPay: netPay.toFixed(2),
      };
    }).sort((a, b) => parseFloat(b.grossPay) - parseFloat(a.grossPay));
  };

  const exportToCSV = () => {
    const payroll = calculatePayroll();
    const headers = [
      "Carer Name", 
      "Hourly Rate", 
      "Regular Hours", 
      "Overtime Hours", 
      "Total Hours",
      "Regular Pay", 
      "Overtime Pay", 
      "Gross Pay",
      "Taxes (22%)",
      "Net Pay",
      "Total Shifts"
    ];
    const rows = payroll.map(p => [
      p.name,
      `$${p.hourlyRate.toFixed(2)}`,
      p.regularHours.toFixed(2),
      p.overtimeHours.toFixed(2),
      p.totalHours.toFixed(2),
      `$${p.regularPay}`,
      `$${p.overtimePay}`,
      `$${p.grossPay}`,
      `$${p.taxes}`,
      `$${p.netPay}`,
      p.totalShifts
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  const payroll = calculatePayroll();
  const totalGross = payroll.reduce((sum, p) => sum + parseFloat(p.grossPay), 0);
  const totalNet = payroll.reduce((sum, p) => sum + parseFloat(p.netPay), 0);
  const totalHours = payroll.reduce((sum, p) => sum + p.totalHours, 0);
  const totalTaxes = payroll.reduce((sum, p) => sum + parseFloat(p.taxes), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payroll Summary Report
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Calculate earnings based on completed shifts</p>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> This is a simplified payroll calculation. In production, integrate with your actual payroll system, 
              accounting for local tax laws, deductions, benefits, and pay schedules.
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
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Total Gross</p>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  ${totalGross.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Total Net</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  ${totalNet.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Total Hours</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {totalHours.toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-900">Total Taxes</p>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  ${totalTaxes.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Carer Name</TableHead>
                  <TableHead className="text-right">Rate/Hr</TableHead>
                  <TableHead className="text-right">Regular Hrs</TableHead>
                  <TableHead className="text-right">OT Hrs</TableHead>
                  <TableHead className="text-right">Total Hrs</TableHead>
                  <TableHead className="text-right">Regular Pay</TableHead>
                  <TableHead className="text-right">OT Pay</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Taxes</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.map((p, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">${p.hourlyRate.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{p.regularHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      {p.overtimeHours > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {p.overtimeHours.toFixed(1)}
                        </Badge>
                      )}
                      {p.overtimeHours === 0 && "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{p.totalHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">${p.regularPay}</TableCell>
                    <TableCell className="text-right">${p.overtimePay}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">
                      ${p.grossPay}
                    </TableCell>
                    <TableCell className="text-right text-red-600">${p.taxes}</TableCell>
                    <TableCell className="text-right font-bold text-blue-700">
                      ${p.netPay}
                    </TableCell>
                  </TableRow>
                ))}
                {payroll.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No payroll data available for the selected period
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