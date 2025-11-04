import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Star, 
  Award, 
  Clock,
  AlertTriangle,
  UserCheck,
  TrendingUp
} from "lucide-react";
import { parseISO, isWithinInterval } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CarerSuggestions({
  client,
  carers,
  shifts,
  leaveRequests,
  selectedDate,
  startTime,
  endTime,
  onSelectCarer,
  currentShiftId,
}) {
  const calculateMatchScore = (carer) => {
    let score = 0;
    const reasons = [];

    // Qualification matching
    const clientNeeds = client.care_needs || [];
    const carerQualifications = carer.qualifications || [];
    const matchedQualifications = clientNeeds.filter(need =>
      carerQualifications.some(qual => 
        qual.toLowerCase().includes(need.toLowerCase()) ||
        need.toLowerCase().includes(qual.toLowerCase())
      )
    );

    if (matchedQualifications.length === clientNeeds.length && clientNeeds.length > 0) {
      score += 40;
      reasons.push({ 
        text: "All qualifications matched", 
        icon: Award, 
        color: "text-green-600" 
      });
    } else if (matchedQualifications.length > 0) {
      score += 20;
      reasons.push({ 
        text: `${matchedQualifications.length}/${clientNeeds.length} qualifications matched`, 
        icon: Award, 
        color: "text-yellow-600" 
      });
    }

    // Continuity of care
    const previousShifts = shifts.filter(
      s => s.carer_id === carer.id && 
           s.client_id === client.id &&
           s.id !== currentShiftId
    );

    if (previousShifts.length > 0) {
      const continuityScore = Math.min(30, previousShifts.length * 5);
      score += continuityScore;
      reasons.push({ 
        text: `${previousShifts.length} previous visit${previousShifts.length > 1 ? 's' : ''}`, 
        icon: Star, 
        color: "text-purple-600" 
      });
    }

    // Availability check
    const isAvailable = checkAvailability(carer, selectedDate, startTime, endTime);
    if (isAvailable) {
      score += 30;
      reasons.push({ 
        text: "Available at this time", 
        icon: CheckCircle, 
        color: "text-green-600" 
      });
    } else {
      reasons.push({ 
        text: "Conflict detected", 
        icon: AlertTriangle, 
        color: "text-red-600" 
      });
    }

    return { score, reasons, isAvailable };
  };

  const checkAvailability = (carer, date, start, end) => {
    // Check if carer is active
    if (carer.status !== 'active') return false;

    // Check leave requests
    const onLeave = leaveRequests.some(leave => {
      if (leave.carer_id !== carer.id || leave.status !== 'approved') return false;
      
      try {
        const leaveStart = parseISO(leave.start_date);
        const leaveEnd = parseISO(leave.end_date);
        const shiftDate = parseISO(date);
        
        return isWithinInterval(shiftDate, { start: leaveStart, end: leaveEnd });
      } catch {
        return false;
      }
    });

    if (onLeave) return false;

    // Check conflicting shifts
    const hasConflict = shifts.some(shift => {
      if (shift.carer_id !== carer.id || shift.id === currentShiftId) return false;
      if (shift.date !== date) return false;

      const shiftStart = shift.start_time || "00:00";
      const shiftEnd = shift.end_time || "23:59";

      // Check for time overlap
      return (
        (start >= shiftStart && start < shiftEnd) ||
        (end > shiftStart && end <= shiftEnd) ||
        (start <= shiftStart && end >= shiftEnd)
      );
    });

    return !hasConflict;
  };

  const activeCarers = carers.filter(c => c.status === 'active');
  
  const rankedCarers = activeCarers
    .map(carer => ({
      ...carer,
      match: calculateMatchScore(carer),
    }))
    .sort((a, b) => b.match.score - a.match.score);

  const getScoreColor = (score) => {
    if (score >= 80) return "from-green-500 to-green-600";
    if (score >= 50) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 50) return "Good Match";
    return "Possible Match";
  };

  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 text-sm">Smart Matching Active</p>
            <p className="text-xs text-blue-700 mt-1">
              Carers ranked by qualifications, availability, and continuity of care
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {rankedCarers.map((carer, index) => (
            <Card 
              key={carer.id}
              className={`p-4 hover:shadow-md transition-all ${
                !carer.match.isAvailable ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-lg">{carer.full_name}</h4>
                    {index === 0 && carer.match.score >= 80 && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900">
                        <Star className="w-3 h-3 mr-1" />
                        Best Match
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{carer.employment_type?.replace('_', ' ')}</p>
                </div>
                
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r ${getScoreColor(carer.match.score)} text-white text-sm font-medium mb-1`}>
                    {carer.match.score}%
                  </div>
                  <p className="text-xs text-gray-500">{getScoreLabel(carer.match.score)}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {carer.match.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <reason.icon className={`w-4 h-4 ${reason.color}`} />
                    <span className="text-gray-700">{reason.text}</span>
                  </div>
                ))}
              </div>

              {carer.qualifications && carer.qualifications.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Qualifications:</p>
                  <div className="flex flex-wrap gap-1">
                    {carer.qualifications.map((qual, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => onSelectCarer(carer.id)}
                disabled={!carer.match.isAvailable}
                className={`w-full ${
                  carer.match.isAvailable
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {carer.match.isAvailable ? 'Assign This Carer' : 'Not Available'}
              </Button>
            </Card>
          ))}

          {rankedCarers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No active carers available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}