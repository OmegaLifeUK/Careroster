import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Users, 
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Play
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/toast";

export default function PayrollProcessing() {
  const [processingPeriod, setProcessingPeriod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: periods = [] } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const data = await base44.entities.PayrollPeriod.list('-start_date', 20);
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheet-entries-approved'],
    queryFn: async () => {
      const data = await base44.entities.TimesheetEntry.filter({ status: 'approved' });
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: payRates = [] } = useQuery({
    queryKey: ['pay-rates'],
    queryFn: async () => {
      const data = await base44.entities.PayRate.list();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: holidayAccruals = [] } = useQuery({
    queryKey: ['holiday-accruals'],
    queryFn: async () => {
      const data = await base44.entities.HolidayAccrual.list();
      return Array.isArray(data) ? data : [];
    },
  });

  // Automated payroll calculation function
  const calculatePayroll = async (periodId) => {
    setIsProcessing(true);
    try {
      const period = periods.find(p => p.id === periodId);
      
      // Get timesheets for this period
      const periodTimesheets = timesheets.filter(t => {
        const tDate = new Date(t.timesheet_date);
        const start = new Date(period.start_date);
        const end = new Date(period.end_date);
        return tDate >= start && tDate <= end && t.status === 'approved';
      });

      // Group by staff
      const staffGroups = {};
      periodTimesheets.forEach(ts => {
        if (!staffGroups[ts.staff_id]) {
          staffGroups[ts.staff_id] = [];
        }
        staffGroups[ts.staff_id].push(ts);
      });

      // Create payslips
      const payslips = [];
      for (const [staffId, staffTimesheets] of Object.entries(staffGroups)) {
        // Calculate hours by pay bucket
        const standardHours = staffTimesheets.filter(t => t.pay_bucket === 'standard').reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        const overtimeHours = staffTimesheets.filter(t => t.pay_bucket === 'overtime').reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        const weekendHours = staffTimesheets.filter(t => t.pay_bucket === 'weekend').reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        const nightHours = staffTimesheets.filter(t => t.pay_bucket === 'night').reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        const bankHolidayHours = staffTimesheets.filter(t => t.pay_bucket === 'bank_holiday').reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        const sleepInHours = staffTimesheets.filter(t => t.pay_bucket === 'sleep_in').reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        
        const totalHours = staffTimesheets.reduce((sum, ts) => sum + (ts.actual_hours || 0), 0);
        const grossPay = staffTimesheets.reduce((sum, ts) => sum + (ts.gross_pay || 0), 0);
        
        // Calculate deductions (simplified - would use actual tax tables)
        const tax = grossPay * 0.20; // 20% basic rate
        const ni = grossPay * 0.12; // 12% NI
        const pension = grossPay * 0.05; // 5% pension
        const netPay = grossPay - tax - ni - pension;

        // Calculate holiday accrual
        const accrual = holidayAccruals.find(h => h.staff_id === staffId);
        const holidayAccrued = totalHours * 0.1207; // 12.07% accrual rate

        // Check NMW compliance
        const nmwRate = 11.44; // Current NMW
        const effectiveRate = grossPay / totalHours;
        const nmwCompliant = effectiveRate >= nmwRate;

        payslips.push({
          staff_id: staffId,
          payroll_period_id: periodId,
          pay_date: period.pay_date,
          period_start: period.start_date,
          period_end: period.end_date,
          total_hours: totalHours,
          standard_hours: standardHours,
          overtime_hours: overtimeHours,
          weekend_hours: weekendHours,
          night_hours: nightHours,
          bank_holiday_hours: bankHolidayHours,
          sleep_in_hours: sleepInHours,
          gross_pay: grossPay,
          tax: tax,
          national_insurance: ni,
          pension: pension,
          net_pay: netPay,
          holiday_accrued_hours: holidayAccrued,
          holiday_balance_hours: (accrual?.hours_remaining || 0) + holidayAccrued,
          nmw_compliant: nmwCompliant,
          nmw_rate_applicable: nmwRate,
          effective_hourly_rate: effectiveRate,
          payment_method: "bank_transfer"
        });

        // Update holiday accrual
        if (accrual) {
          await base44.entities.HolidayAccrual.update(accrual.id, {
            total_hours_worked: (accrual.total_hours_worked || 0) + totalHours,
            total_accrued_hours: (accrual.total_accrued_hours || 0) + holidayAccrued,
            hours_remaining: (accrual.hours_remaining || 0) + holidayAccrued,
            last_calculation_date: new Date().toISOString()
          });
        }
      }

      // Create all payslips
      await base44.entities.Payslip.bulkCreate(payslips);

      // Update period
      await base44.entities.PayrollPeriod.update(periodId, {
        status: 'processed',
        total_staff: Object.keys(staffGroups).length,
        total_hours: payslips.reduce((sum, p) => sum + p.total_hours, 0),
        total_gross_pay: payslips.reduce((sum, p) => sum + p.gross_pay, 0),
        total_deductions: payslips.reduce((sum, p) => sum + (p.tax + p.national_insurance + p.pension), 0),
        total_net_pay: payslips.reduce((sum, p) => sum + p.net_pay, 0)
      });

      // Update timesheets to paid status
      for (const ts of periodTimesheets) {
        await base44.entities.TimesheetEntry.update(ts.id, {
          status: 'paid',
          payroll_period_id: periodId
        });
      }

      queryClient.invalidateQueries();
      toast.success("Payroll Processed", `Generated ${payslips.length} payslips successfully`);
      setIsProcessing(false);
      
      return payslips.length;
    } catch (error) {
      toast.error("Processing Failed", error.message);
      setIsProcessing(false);
      throw error;
    }
  };

  // Auto-process when period status changes to 'processing'
  React.useEffect(() => {
    const processingPeriods = periods.filter(p => p.status === 'processing');
    
    if (processingPeriods.length > 0 && !isProcessing) {
      processingPeriods.forEach(period => {
        calculatePayroll(period.id);
      });
    }
  }, [periods]);

  const processPayrollMutation = useMutation({
    mutationFn: calculatePayroll,
    onSuccess: () => {},
    onError: () => {}
  });

  const exportToCSV = (period) => {
    // Simplified export - would include full payslip details
    const csv = "Staff,Hours,Gross,Tax,NI,Pension,Net\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${period.period_name}.csv`;
    link.click();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payroll Processing
            </h1>
            <p className="text-gray-500">Generate payslips and export to accounting software</p>
          </div>
        </div>

        {/* Processing Instructions */}
        <Card className="mb-6 border-l-4 border-blue-500">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Processing Steps:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Ensure all timesheets are approved for the period</li>
              <li>Click "Process Payroll" for the desired period</li>
              <li>System calculates gross pay, deductions, and net pay</li>
              <li>Holiday accruals are automatically calculated and updated</li>
              <li>NMW compliance is verified for all staff</li>
              <li>Export to Sage/Xero for payment processing</li>
            </ol>
          </CardContent>
        </Card>

        {/* Payroll Periods */}
        <div className="space-y-4">
          {periods.map((period) => {
            const periodTimesheets = timesheets.filter(t => {
              try {
                const tDate = new Date(t.timesheet_date);
                const start = new Date(period.start_date);
                const end = new Date(period.end_date);
                return tDate >= start && tDate <= end;
              } catch {
                return false;
              }
            });

            const approvedCount = periodTimesheets.filter(t => t.status === 'approved').length;
            const pendingCount = periodTimesheets.filter(t => t.status !== 'approved' && t.status !== 'paid').length;

            return (
              <Card key={period.id} className="border-l-4 border-green-500">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">{period.period_name}</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={
                          period.status === 'processed' ? 'bg-green-100 text-green-800' :
                          period.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {period.status}
                        </Badge>
                        {period.exported_to_accounting && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Exported
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(period.start_date), 'MMM d')} - {format(parseISO(period.end_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        Pay Date: {format(parseISO(period.pay_date), 'EEEE, MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      {period.total_gross_pay && (
                        <>
                          <p className="text-sm text-gray-600">Total Gross</p>
                          <p className="text-2xl font-bold text-green-600">
                            £{period.total_gross_pay.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">Total Net</p>
                          <p className="text-lg font-semibold">
                            £{period.total_net_pay?.toLocaleString()}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Staff</p>
                      <p className="text-lg font-semibold">{period.total_staff || staff.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Hours</p>
                      <p className="text-lg font-semibold">{period.total_hours?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved Timesheets</p>
                      <p className="text-lg font-semibold text-green-600">{approvedCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-lg font-semibold text-orange-600">{pendingCount}</p>
                    </div>
                  </div>

                  {pendingCount > 0 && (
                    <div className="p-3 bg-orange-50 rounded border border-orange-200 mb-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <p className="text-sm text-orange-800">
                          {pendingCount} timesheet{pendingCount !== 1 ? 's' : ''} still need approval before processing
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {period.status === 'draft' && (
                      <Button
                        onClick={() => calculatePayroll(period.id)}
                        disabled={pendingCount > 0 || isProcessing}
                        className="bg-green-600"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isProcessing ? 'Processing...' : 'Process Payroll'}
                      </Button>
                    )}
                    
                    {period.status === 'approved' && (
                      <Button
                        onClick={async () => {
                          await base44.entities.PayrollPeriod.update(period.id, { status: 'processing' });
                          queryClient.invalidateQueries(['payroll-periods']);
                        }}
                        disabled={pendingCount > 0 || isProcessing}
                        className="bg-blue-600"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Auto-Process Payroll
                      </Button>
                    )}
                    
                    {period.status === 'processed' && (
                      <>
                        <Button variant="outline" onClick={() => exportToCSV(period)}>
                          <Download className="w-4 h-4 mr-2" />
                          Export to CSV
                        </Button>
                        <Button variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          View Payslips
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {periods.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">No Payroll Periods</h3>
              <p className="text-gray-600">Create a payroll period to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}