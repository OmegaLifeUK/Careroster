import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, PoundSterling, Clock, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MyPayslips({ user }) {
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['my-payslips', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        const data = await base44.entities.Payslip.filter({ staff_email: user.email });
        return Array.isArray(data) ? data.sort((a, b) => new Date(b.pay_date) - new Date(a.pay_date)) : [];
      } catch (error) {
        console.log("Payslips not available");
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const handleDownload = (payslip) => {
    if (payslip.file_url) {
      window.open(payslip.file_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (payslips.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Payslips Available</h3>
        <p className="text-gray-500">Your payslips will appear here once processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <PoundSterling className="w-5 h-5 text-green-600" />
          My Payslips
        </h2>
      </div>

      <div className="space-y-3">
        {payslips.map((payslip) => (
          <Card key={payslip.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {payslip.period_description || format(parseISO(payslip.pay_date), 'MMMM yyyy')}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Paid: {format(parseISO(payslip.pay_date), 'dd MMM yyyy')}
                      </span>
                      {payslip.hours_worked && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {payslip.hours_worked}h worked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      £{payslip.net_pay?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">Net Pay</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(payslip)}
                    disabled={!payslip.file_url}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              {(payslip.gross_pay || payslip.deductions) && (
                <div className="mt-3 pt-3 border-t flex gap-6 text-sm">
                  {payslip.gross_pay && (
                    <div>
                      <span className="text-gray-500">Gross: </span>
                      <span className="font-medium">£{payslip.gross_pay.toFixed(2)}</span>
                    </div>
                  )}
                  {payslip.deductions && (
                    <div>
                      <span className="text-gray-500">Deductions: </span>
                      <span className="font-medium text-red-600">-£{payslip.deductions.toFixed(2)}</span>
                    </div>
                  )}
                  {payslip.tax && (
                    <div>
                      <span className="text-gray-500">Tax: </span>
                      <span className="font-medium">£{payslip.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {payslip.national_insurance && (
                    <div>
                      <span className="text-gray-500">NI: </span>
                      <span className="font-medium">£{payslip.national_insurance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}