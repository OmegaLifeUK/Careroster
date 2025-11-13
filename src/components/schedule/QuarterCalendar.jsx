import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { 
  format, 
  addDays,
  startOfDay,
  isSameDay, 
  parseISO,
  isWithinInterval,
  eachWeekOfInterval
} from "date-fns";

export default function QuarterCalendar({ shifts = [], carers = [], clients = [], onShiftClick }) {
  const [startDate, setStartDate] = useState(new Date());
  const endDate = addDays(startDate, 89); // 90 days

  const weeks = eachWeekOfInterval({ start: startDate, end: endDate });

  const getShiftsForWeek = (weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    return Array.isArray(shifts) ? shifts.filter(shift => {
      try {
        const shiftDate = parseISO(shift.date);
        return isWithinInterval(shiftDate, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    }) : [];
  };

  const getWeekStats = (weekShifts) => {
    const shiftsArray = Array.isArray(weekShifts) ? weekShifts : [];
    return {
      total: shiftsArray.length,
      filled: shiftsArray.filter(s => s.carer_id).length,
      completed: shiftsArray.filter(s => s.status === 'completed').length,
      unfilled: shiftsArray.filter(s => !s.carer_id).length,
    };
  };

  const navigatePeriod = (days) => {
    setStartDate(addDays(startDate, days));
  };

  const shiftsArray = Array.isArray(shifts) ? shifts : [];

  return (
    <div className="space-y-4">
      {/* Period Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigatePeriod(-90)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous 90 Days
            </Button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
              </h2>
              <p className="text-sm text-gray-500">90-Day Overview</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStartDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePeriod(90)}
              >
                Next 90 Days
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Shifts</p>
            <p className="text-2xl font-bold">{shiftsArray.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Filled</p>
            <p className="text-2xl font-bold text-green-600">
              {shiftsArray.filter(s => s.carer_id).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Unfilled</p>
            <p className="text-2xl font-bold text-orange-600">
              {shiftsArray.filter(s => !s.carer_id).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Fill Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {shiftsArray.length > 0 
                ? Math.round((shiftsArray.filter(s => s.carer_id).length / shiftsArray.length) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Breakdown */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Weekly Breakdown
          </h3>
          
          <div className="space-y-2">
            {weeks.map((weekStart, index) => {
              const weekEnd = addDays(weekStart, 6);
              const weekShifts = getShiftsForWeek(weekStart);
              const stats = getWeekStats(weekShifts);
              const fillRate = stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0;

              return (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">
                        Week {index + 1}: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                      </h4>
                    </div>
                    <Badge className={fillRate >= 90 ? 'bg-green-100 text-green-800' : 
                                    fillRate >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'}>
                      {fillRate}% Filled
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Shifts</p>
                      <p className="font-bold text-lg">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Filled</p>
                      <p className="font-bold text-lg text-green-600">{stats.filled}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Unfilled</p>
                      <p className="font-bold text-lg text-orange-600">{stats.unfilled}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Completed</p>
                      <p className="font-bold text-lg text-blue-600">{stats.completed}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          fillRate >= 90 ? 'bg-green-500' : 
                          fillRate >= 70 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${fillRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}