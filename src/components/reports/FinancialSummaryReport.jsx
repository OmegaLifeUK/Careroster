import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { isWithinInterval, parseISO } from "date-fns";

export default function FinancialSummaryReport({ invoices, payslips, clients, staff, filters }) {
  const { dateFrom, dateTo, selectedClient } = filters;

  const filteredInvoices = invoices.filter(inv => {
    try {
      const date = parseISO(inv.invoice_date);
      const inRange = isWithinInterval(date, { 
        start: parseISO(dateFrom), 
        end: parseISO(dateTo) 
      });
      const matchesClient = selectedClient === "all" || inv.client_id === selectedClient;
      return inRange && matchesClient;
    } catch {
      return false;
    }
  });

  const filteredPayslips = payslips.filter(p => {
    try {
      const date = parseISO(p.pay_date);
      const inRange = isWithinInterval(date, { 
        start: parseISO(dateFrom), 
        end: parseISO(dateTo) 
      });
      return inRange;
    } catch {
      return false;
    }
  });

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  
  const totalPayrollCost = filteredPayslips.reduce((sum, p) => sum + (p.gross_pay || 0), 0);
  const totalNetPay = filteredPayslips.reduce((sum, p) => sum + (p.net_pay || 0), 0);
  const totalDeductions = filteredPayslips.reduce((sum, p) => sum + ((p.tax || 0) + (p.national_insurance || 0) + (p.pension || 0)), 0);

  const grossProfit = totalRevenue - totalPayrollCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const clientFinancials = clients.map(c => {
    const clientInvoices = filteredInvoices.filter(inv => inv.client_id === c.id);
    const revenue = clientInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paid = clientInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    const outstanding = clientInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
    
    return {
      ...c,
      revenue,
      paid,
      outstanding,
      invoiceCount: clientInvoices.length
    };
  }).filter(c => c.revenue > 0);

  const exportCSV = () => {
    const headers = ["Client Name", "Total Revenue", "Amount Paid", "Outstanding", "Invoice Count"];
    const rows = clientFinancials.map(c => [
      c.full_name,
      c.revenue.toFixed(2),
      c.paid.toFixed(2),
      c.outstanding.toFixed(2),
      c.invoiceCount
    ]);

    const csv = [
      "Financial Summary Report",
      `Period: ${dateFrom} to ${dateTo}`,
      "",
      `Total Revenue: £${totalRevenue.toFixed(2)}`,
      `Total Payroll Cost: £${totalPayrollCost.toFixed(2)}`,
      `Gross Profit: £${grossProfit.toFixed(2)}`,
      `Profit Margin: ${profitMargin.toFixed(1)}%`,
      "",
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-summary-${dateFrom}-to-${dateTo}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financial Summary Report</h2>
        <Button onClick={exportCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold">£{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Invoiced amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <p className="text-sm text-gray-600">Payroll Cost</p>
            </div>
            <p className="text-2xl font-bold">£{totalPayrollCost.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Staff wages</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-gray-600">Gross Profit</p>
            </div>
            <p className="text-2xl font-bold">£{grossProfit.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Revenue - Payroll</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-gray-600">Profit Margin</p>
            </div>
            <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Gross margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Paid</span>
                <span className="font-semibold text-green-600">£{totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Outstanding</span>
                <span className="font-semibold text-orange-600">£{totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Collection Rate</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payroll Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Gross Pay</span>
                <span className="font-semibold">£{totalPayrollCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Deductions</span>
                <span className="font-semibold text-red-600">£{totalDeductions.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Net Pay</span>
                  <span className="font-bold">£{totalNetPay.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Invoices</span>
                <span className="font-semibold">{filteredInvoices.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payslips</span>
                <span className="font-semibold">{filteredPayslips.length}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Avg Invoice</span>
                  <span className="font-bold">
                    £{filteredInvoices.length > 0 ? (totalRevenue / filteredInvoices.length).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Per Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Client Name</th>
                  <th className="text-right p-3 font-semibold">Total Revenue</th>
                  <th className="text-right p-3 font-semibold">Amount Paid</th>
                  <th className="text-right p-3 font-semibold">Outstanding</th>
                  <th className="text-right p-3 font-semibold">Invoices</th>
                  <th className="text-right p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientFinancials.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.full_name}</td>
                    <td className="p-3 text-right">£{c.revenue.toLocaleString()}</td>
                    <td className="p-3 text-right text-green-600">£{c.paid.toLocaleString()}</td>
                    <td className="p-3 text-right text-orange-600">£{c.outstanding.toLocaleString()}</td>
                    <td className="p-3 text-right">{c.invoiceCount}</td>
                    <td className="p-3 text-right">
                      <Badge className={c.outstanding === 0 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                        {c.outstanding === 0 ? "Paid" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {clientFinancials.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No financial data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}