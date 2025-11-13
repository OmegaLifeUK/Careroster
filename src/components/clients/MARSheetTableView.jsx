import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export default function MARSheetTableView({ marSheet, client }) {
  // Get all dates for the month
  const monthYear = marSheet.month_year;
  const [monthName, year] = monthYear.split(' ');
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const startDate = startOfMonth(new Date(year, monthIndex));
  const endDate = endOfMonth(new Date(year, monthIndex));
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });

  // Group dates into weeks (7 days each)
  const weeks = [];
  for (let i = 0; i < allDates.length; i += 7) {
    weeks.push(allDates.slice(i, i + 7));
  }

  // Get administration record for a specific date and time slot
  const getRecord = (date, timeSlot) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return marSheet.administration_records?.find(
      r => r.date === dateStr && r.time_slot === timeSlot
    );
  };

  // Color coding for status
  const getStatusColor = (code) => {
    switch(code) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'R': return 'bg-yellow-100 text-yellow-800';
      case 'S': return 'bg-blue-100 text-blue-800';
      case 'H': return 'bg-purple-100 text-purple-800';
      case 'ND': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader className="bg-purple-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold">Name: <span className="font-normal">{client.full_name}</span></p>
              <p className="text-sm font-semibold">Date of Birth: <span className="font-normal">{client.date_of_birth || 'N/A'}</span></p>
              <p className="text-sm font-semibold">Address: <span className="font-normal">{client.address?.street || 'N/A'}</span></p>
            </div>
            <div>
              <p className="text-sm font-semibold">Period: <span className="font-normal">{marSheet.month_year}</span></p>
              <p className="text-sm font-semibold">Prescriber: <span className="font-normal">{marSheet.prescriber || 'N/A'}</span></p>
              <p className="text-sm font-semibold">Pharmacy: <span className="font-normal">{marSheet.pharmacy || 'N/A'}</span></p>
            </div>
          </div>
          {marSheet.allergies_warnings && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-900">⚠️ Allergies/Warnings:</p>
              <p className="text-sm text-red-800">{marSheet.allergies_warnings}</p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Medication Details */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="font-semibold">Medication:</p>
              <p className="text-lg font-bold text-purple-700">{marSheet.medication_name}</p>
            </div>
            <div>
              <p className="font-semibold">Dose:</p>
              <p className="text-lg font-bold">{marSheet.dose}</p>
            </div>
            <div>
              <p className="font-semibold">Route:</p>
              <p className="capitalize">{marSheet.route}</p>
            </div>
            <div>
              <p className="font-semibold">Frequency:</p>
              <p>{marSheet.frequency}</p>
            </div>
          </div>
          {marSheet.reason_for_medication && (
            <div className="mt-3 p-2 bg-blue-50 rounded">
              <p className="text-sm"><strong>Reason:</strong> {marSheet.reason_for_medication}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key/Legend */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Badge className="bg-green-100 text-green-800">A</Badge>
              <span>Administered</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-yellow-100 text-yellow-800">R</Badge>
              <span>Refused</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-blue-100 text-blue-800">S</Badge>
              <span>Self-administered</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-purple-100 text-purple-800">H</Badge>
              <span>Hospital</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-gray-100 text-gray-800">ND</Badge>
              <span>Not in home</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MAR Chart Table - One table per week */}
      {weeks.map((weekDates, weekIndex) => (
        <Card key={weekIndex}>
          <CardHeader>
            <CardTitle className="text-lg">Week {weekIndex + 1}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left w-24">Time</th>
                  {weekDates.map((date, idx) => (
                    <th key={idx} className="border p-2 text-center min-w-[80px]">
                      <div className="font-semibold">{format(date, 'EEE')}</div>
                      <div className="text-gray-600">{format(date, 'dd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marSheet.time_slots?.map((timeSlot, timeIdx) => (
                  <tr key={timeIdx}>
                    <td className="border p-2 font-semibold bg-gray-50">
                      {timeSlot}
                    </td>
                    {weekDates.map((date, dateIdx) => {
                      const record = getRecord(date, timeSlot);
                      return (
                        <td key={dateIdx} className="border p-1 text-center align-middle">
                          {record ? (
                            <div className="space-y-1">
                              <Badge className={`${getStatusColor(record.code)} text-xs px-1`}>
                                {record.code}
                              </Badge>
                              <div className="text-[10px] text-gray-600 font-semibold">
                                {record.staff_initials}
                              </div>
                              {record.notes && (
                                <div className="text-[9px] text-blue-600" title={record.notes}>
                                  📝
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-300">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {/* Stock Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stock Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-semibold text-blue-900">Stock Level</p>
              <p className="text-2xl font-bold text-blue-700">{marSheet.stock_level || 0}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <p className="font-semibold text-yellow-900">Reorder Level</p>
              <p className="text-2xl font-bold text-yellow-700">{marSheet.reorder_level || 0}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold text-gray-900">Last Audited</p>
              <p className="text-sm text-gray-700">
                {marSheet.last_audited ? format(parseISO(marSheet.last_audited), 'MMM d, yyyy') : 'Not audited'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRN Details if applicable */}
      {marSheet.as_required && marSheet.prn_details && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg text-orange-900">PRN (As Required) Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Maximum Dose (24h):</strong> {marSheet.prn_details.maximum_dose_24h}</p>
              <p><strong>Minimum Interval:</strong> {marSheet.prn_details.minimum_interval_hours} hours</p>
              <p><strong>Indications:</strong> {marSheet.prn_details.indications}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}