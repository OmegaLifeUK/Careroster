import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Award, CheckCircle, Clock, AlertCircle } from "lucide-react";

// Helper to estimate distance based on postcode area
const getPostcodeDistance = (postcode1, postcode2) => {
  if (!postcode1 || !postcode2) return 999; // Unknown = far
  
  const area1 = postcode1.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  const area2 = postcode2.trim().split(' ')[0].replace(/\d/g, '').toUpperCase();
  
  // Same postcode area = close
  if (area1 === area2) return 0;
  
  // Define proximity groups (cities/regions that are reasonably close)
  const proximityGroups = [
    ['M', 'SK', 'OL', 'BL', 'WN'], // Greater Manchester
    ['BN', 'RH', 'TN'], // Brighton/Sussex area
    ['L', 'CH', 'WA'], // Liverpool/Merseyside
    ['B', 'WS', 'WV', 'DY'], // Birmingham/West Midlands
    ['LS', 'BD', 'HX', 'WF'], // Leeds/West Yorkshire
    ['S', 'DN', 'HD'], // Sheffield/South Yorkshire
    ['NE', 'SR', 'DH'], // Newcastle/Tyne and Wear
    ['GL', 'SN', 'BA'], // Gloucestershire/Wiltshire
    ['NG', 'DE', 'LE'], // Nottingham/Derby/Leicester
    ['CV', 'LE', 'NN'], // Coventry/Warwickshire
  ];
  
  // Check if both postcodes are in the same proximity group
  for (const group of proximityGroups) {
    if (group.includes(area1) && group.includes(area2)) {
      return 15; // Same region = medium distance
    }
  }
  
  // Different regions = far
  return 100;
};

export default function CarerSuggestions({ 
  client, 
  carers = [], 
  shifts = [], 
  leaveRequests = [], 
  selectedDate, 
  startTime, 
  endTime, 
  onSelectCarer,
  currentShiftId 
}) {
  const getSuggestedCarers = () => {
    if (!client || !Array.isArray(carers)) return [];

    const shiftsArray = Array.isArray(shifts) ? shifts : [];
    const leaveArray = Array.isArray(leaveRequests) ? leaveRequests : [];
    const clientPostcode = client.address?.postcode;

    return carers
      .filter(carer => {
        if (!carer || carer.status !== 'active') return false;

        // Check if carer is on leave
        const isOnLeave = leaveArray.some(lr => 
          lr && 
          lr.carer_id === carer.id && 
          lr.status === 'approved' &&
          selectedDate >= lr.start_date &&
          selectedDate <= lr.end_date
        );
        if (isOnLeave) return false;

        // Check for conflicts with other shifts
        const carerShifts = shiftsArray.filter(s => 
          s && 
          s.id !== currentShiftId &&
          s.carer_id === carer.id && 
          s.date === selectedDate
        );

        const hasConflict = carerShifts.some(cs => {
          if (!cs) return false;
          const csStart = cs.start_time || "00:00";
          const csEnd = cs.end_time || "23:59";
          
          return (
            (startTime >= csStart && startTime < csEnd) ||
            (endTime > csStart && endTime <= csEnd) ||
            (startTime <= csStart && endTime >= csEnd)
          );
        });

        return !hasConflict;
      })
      .map(carer => {
        let score = 0;
        const reasons = [];
        const warnings = [];

        // Geographic proximity - CRITICAL FACTOR
        const carerPostcode = carer.address?.postcode;
        const distance = getPostcodeDistance(clientPostcode, carerPostcode);
        
        if (distance === 0) {
          score += 100; // Same postcode area = huge bonus
          reasons.push("Same area");
        } else if (distance <= 15) {
          score += 50; // Same region = good
          reasons.push("Nearby region");
        } else if (distance >= 100) {
          score -= 200; // Far away = massive penalty
          warnings.push("⚠️ Very far from client");
        }

        // Preferred carer
        if (Array.isArray(client.preferred_carers) && client.preferred_carers.includes(carer.id)) {
          score += 50;
          reasons.push("Preferred carer");
        }

        // Has worked with client before
        const pastShifts = shiftsArray.filter(s => 
          s && 
          s.carer_id === carer.id && 
          s.client_id === client.id &&
          s.status === 'completed'
        );
        if (pastShifts.length > 0) {
          score += Math.min(pastShifts.length * 5, 25);
          reasons.push(`${pastShifts.length} past shifts`);
        }

        // Availability (fewer shifts = higher score)
        const carerShiftCount = shiftsArray.filter(s => s && s.carer_id === carer.id).length;
        score += Math.max(0, 20 - carerShiftCount);
        if (carerShiftCount < 5) {
          reasons.push("Low workload");
        }

        // Qualifications
        if (Array.isArray(carer.qualifications) && carer.qualifications.length > 0) {
          score += 10;
          reasons.push(`${carer.qualifications.length} qualifications`);
        }

        return { carer, score, reasons, warnings, distance };
      })
      .sort((a, b) => (b?.score || 0) - (a?.score || 0));
  };

  const suggestedCarers = getSuggestedCarers();

  if (suggestedCarers.length === 0) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="font-medium text-orange-900">No Available Carers</p>
          <p className="text-sm text-orange-700 mt-1">
            All carers are either on leave or have conflicting shifts at this time
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Suggested Carers (Ranked by compatibility):
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {suggestedCarers.map(({ carer, score, reasons, warnings, distance }, index) => {
          if (!carer) return null;
          const isFarAway = distance >= 100;
          
          return (
            <Card
              key={carer.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                index === 0 && !isFarAway ? 'border-2 border-green-400 bg-green-50' : ''
              } ${isFarAway ? 'border-2 border-red-400 bg-red-50 opacity-75' : ''}`}
              onClick={() => {
                if (isFarAway) {
                  const clientPostcode = client.address?.postcode || 'Unknown';
                  const carerPostcode = carer.address?.postcode || 'Unknown';
                  if (!confirm(`⚠️ WARNING: Geographic Mismatch!\n\nClient: ${clientPostcode}\nCarer: ${carerPostcode}\n\nThese locations are very far apart (different regions). This assignment may not be practical.\n\nDo you still want to assign this carer?`)) {
                    return;
                  }
                }
                onSelectCarer && onSelectCarer(carer.id);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                    isFarAway ? 'from-red-400 to-red-500' : 'from-blue-400 to-blue-500'
                  }`}>
                    {carer.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {carer.full_name}
                      </p>
                      {carer.address?.postcode && (
                        <Badge variant="outline" className="text-xs">
                          {carer.address.postcode}
                        </Badge>
                      )}
                      {index === 0 && !isFarAway && (
                        <Badge className="bg-green-600 text-white text-xs">
                          Best Match
                        </Badge>
                      )}
                      {!isFarAway && (
                        <Badge variant="outline" className="text-xs">
                          Score: {score}
                        </Badge>
                      )}
                      {isFarAway && (
                        <Badge className="bg-red-600 text-white text-xs animate-pulse">
                          Geographic Mismatch
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {warnings.map((warning, idx) => (
                        <div key={`warn-${idx}`} className="flex items-center gap-1 text-xs text-red-700 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {warning}
                        </div>
                      ))}
                      {!isFarAway && reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFarAway) {
                        const clientPostcode = client.address?.postcode || 'Unknown';
                        const carerPostcode = carer.address?.postcode || 'Unknown';
                        if (!confirm(`⚠️ WARNING: Geographic Mismatch!\n\nClient: ${clientPostcode}\nCarer: ${carerPostcode}\n\nThese locations are very far apart (different regions). This assignment may not be practical.\n\nDo you still want to assign this carer?`)) {
                          return;
                        }
                      }
                      onSelectCarer && onSelectCarer(carer.id);
                    }}
                    className={isFarAway ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                  >
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}