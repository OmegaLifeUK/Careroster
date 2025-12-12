import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  MapPin,
  Award,
  Heart,
  Car,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  X,
  Info,
  Send
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addDays, parseISO, differenceInMinutes, isWithinInterval, getDay } from "date-fns";
import { checkCarerAvailability } from "@/components/availability/AvailabilityChecker";
import { Textarea } from "@/components/ui/textarea";

export default function AIShiftAllocator({ onClose, onAllocationsApplied }) {
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });
  const [careType, setCareType] = useState("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [allocations, setAllocations] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [expandedShift, setExpandedShift] = useState(null);
  const [selectedAllocations, setSelectedAllocations] = useState({});
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [showOvertimePanel, setShowOvertimePanel] = useState(false);
  const [selectedOvertimeCarers, setSelectedOvertimeCarers] = useState({});
  const [overtimeMessage, setOvertimeMessage] = useState("Hi, we have an unfilled shift that needs coverage. Would you be available to work this shift? Please let us know as soon as possible.");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all required data
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-for-allocation', dateRange],
    queryFn: async () => {
      try {
        const allShifts = await base44.entities.Shift.list();
        const shiftsArray = Array.isArray(allShifts) ? allShifts : [];
        return shiftsArray.filter(s => 
          s && s.date >= dateRange.start && 
          s.date <= dateRange.end &&
          (!s.carer_id || s.status === 'draft' || s.status === 'unfilled')
        );
      } catch {
        return [];
      }
    }
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits-for-allocation', dateRange],
    queryFn: async () => {
      try {
        const allVisits = await base44.entities.Visit.list();
        const visitsArray = Array.isArray(allVisits) ? allVisits : [];
        return visitsArray.filter(v => {
          if (!v) return false;
          const visitDate = v.scheduled_start ? format(new Date(v.scheduled_start), 'yyyy-MM-dd') : null;
          return visitDate && 
            visitDate >= dateRange.start && 
            visitDate <= dateRange.end &&
            (!v.staff_id && !v.assigned_staff_id);
        });
      } catch {
        return [];
      }
    }
  });

  const { data: allShifts = [] } = useQuery({
    queryKey: ['all-shifts-period', dateRange],
    queryFn: async () => {
      try {
        const data = await base44.entities.Shift.list();
        const shiftsArray = Array.isArray(data) ? data : [];
        return shiftsArray.filter(s => s && s.date >= dateRange.start && s.date <= dateRange.end);
      } catch {
        return [];
      }
    }
  });

  const { data: allVisits = [] } = useQuery({
    queryKey: ['all-visits-period', dateRange],
    queryFn: async () => {
      try {
        const data = await base44.entities.Visit.list();
        const visitsArray = Array.isArray(data) ? data : [];
        return visitsArray.filter(v => {
          if (!v) return false;
          const visitDate = v.scheduled_start ? format(new Date(v.scheduled_start), 'yyyy-MM-dd') : null;
          return visitDate && visitDate >= dateRange.start && visitDate <= dateRange.end;
        });
      } catch {
        return [];
      }
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-for-allocation'],
    queryFn: async () => {
      const data = await base44.entities.Staff.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: carers = [] } = useQuery({
    queryKey: ['carers-for-allocation'],
    queryFn: async () => {
      const data = await base44.entities.Carer.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-allocation'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Client.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  });

  const { data: domClients = [] } = useQuery({
    queryKey: ['domclients-for-allocation'],
    queryFn: async () => {
      try {
        const data = await base44.entities.DomCareClient.list();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  });

  const allClients = [...clients, ...domClients];

  const { data: qualifications = [] } = useQuery({
    queryKey: ['qualifications'],
    queryFn: async () => {
      const data = await base44.entities.Qualification.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests-period', dateRange],
    queryFn: async () => {
      const requests = await base44.entities.LeaveRequest.list();
      const requestsArray = Array.isArray(requests) ? requests : [];
      return requestsArray.filter(r => 
        r && r.status === 'approved' &&
        r.start_date <= dateRange.end &&
        r.end_date >= dateRange.start
      );
    }
  });

  const { data: carerAvailability = [] } = useQuery({
    queryKey: ['carer-availability'],
    queryFn: async () => {
      const data = await base44.entities.CarerAvailability.list();
      return Array.isArray(data) ? data : [];
    }
  });

  const staffArray = Array.isArray(staff) ? staff : [];
  const carersArray = Array.isArray(carers) ? carers : [];
  const allCarers = [...staffArray.filter(s => s && s.is_active !== false), ...carersArray.filter(c => c && c.status === 'active')];

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    }
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Visit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    }
  });

  // Check full availability using the availability checker
  const checkFullAvailability = (staffId, date, startTime, endTime) => {
    return checkCarerAvailability(staffId, date, startTime, endTime, carerAvailability, leaveRequests);
  };

  // Check if staff is on leave for a given date
  const isOnLeave = (staffId, date) => {
    return leaveRequests.some(leave => 
      leave.carer_id === staffId &&
      date >= leave.start_date &&
      date <= leave.end_date
    );
  };

  // Check if staff has conflicting shift
  const hasConflictingShift = (staffId, date, startTime, endTime) => {
    return allShifts.some(shift => 
      shift.carer_id === staffId &&
      shift.date === date &&
      shift.id !== expandedShift &&
      timeOverlaps(shift.start_time, shift.end_time, startTime, endTime)
    );
  };

  const timeOverlaps = (start1, end1, start2, end2) => {
    const toMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1), e1 = toMinutes(end1);
    const s2 = toMinutes(start2), e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  };

  // Calculate distance score based on postcodes
  const calculateProximityScore = (staffPostcode, clientPostcode) => {
    if (!staffPostcode || !clientPostcode) return 50;
    const staffPrefix = staffPostcode.split(' ')[0]?.toUpperCase();
    const clientPrefix = clientPostcode.split(' ')[0]?.toUpperCase();
    if (staffPrefix === clientPrefix) return 100;
    if (staffPrefix?.substring(0, 2) === clientPrefix?.substring(0, 2)) return 75;
    return 25;
  };

  // Check qualification match
  const hasRequiredQualification = (staffQuals = [], requiredQual) => {
    if (!requiredQual) return true;
    return staffQuals.includes(requiredQual);
  };

  // Check if staff is preferred by client
  const isPreferredCarer = (staffId, clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.preferred_carers?.includes(staffId) || false;
  };

  // Calculate staff workload for the period
  const getStaffWorkload = (staffId) => {
    const staffShifts = allShifts.filter(s => s.carer_id === staffId);
    return staffShifts.reduce((total, s) => total + (s.duration_hours || 0), 0);
  };

  // Get max hours constraints for a carer
  const getCarerHoursConstraints = (carerId) => {
    const constraints = carerAvailability.find(a => 
      a.carer_id === carerId && 
      (a.max_hours_per_week || a.max_hours_per_day)
    );
    return {
      maxPerWeek: constraints?.max_hours_per_week || 48, // Default to 48 hours working time directive
      maxPerDay: constraints?.max_hours_per_day || 12
    };
  };

  // Calculate hours worked on a specific day
  const getDayWorkload = (staffId, date) => {
    const dayShifts = allShifts.filter(s => s.carer_id === staffId && s.date === date);
    return dayShifts.reduce((total, s) => total + (s.duration_hours || 0), 0);
  };

  // Main AI allocation function
  const runAIAllocation = async () => {
    setIsAnalyzing(true);
    setAllocations(null);
    setConflicts([]);
    setGaps([]);

    try {
      const unfilledShifts = shifts.filter(s => 
        careType === 'all' || s.care_type === careType
      );

      const unfilledVisits = visits;

      const allUnfilled = [...unfilledShifts, ...unfilledVisits];

      if (allUnfilled.length === 0) {
        toast.info("No Unfilled Shifts", "All shifts in this period are already allocated");
        setIsAnalyzing(false);
        return;
      }

      // Build allocation suggestions
      const suggestions = [];
      const detectedConflicts = [];
      const detectedGaps = [];

      for (const shift of allUnfilled) {
        const isVisit = !!shift.scheduled_start;
        const shiftDate = isVisit ? format(new Date(shift.scheduled_start), 'yyyy-MM-dd') : shift.date;
        const shiftStartTime = isVisit ? format(new Date(shift.scheduled_start), 'HH:mm') : shift.start_time;
        const shiftEndTime = isVisit ? format(new Date(shift.scheduled_end), 'HH:mm') : shift.end_time;
        const shiftDuration = isVisit ? shift.duration_minutes / 60 : shift.duration_hours;

        const client = allClients.find(c => c.id === shift.client_id);
        const candidateScores = [];

        for (const carer of allCarers) {
          let score = 0;
          const reasons = [];
          const warnings = [];

          // Check full availability using availability module
          const availabilityCheck = checkFullAvailability(carer.id, shiftDate, shiftStartTime, shiftEndTime);
          if (!availabilityCheck.isAvailable) {
            if (availabilityCheck.reason === 'On approved leave') {
              continue;
            }
            if (availabilityCheck.reason === 'Not a working day') {
              warnings.push("Not scheduled to work");
              score -= 50;
            } else if (availabilityCheck.reason?.includes('Outside working hours')) {
              warnings.push("Outside working hours");
              score -= 30;
            } else {
              continue;
            }
          } else if (availabilityCheck.workingHours) {
            reasons.push("Within working hours");
            score += 15;
          }

          // Check for conflicting shifts/visits
          const hasConflict = allShifts.some(s => 
            s.carer_id === carer.id &&
            s.date === shiftDate &&
            timeOverlaps(s.start_time, s.end_time, shiftStartTime, shiftEndTime)
          ) || allVisits.some(v => {
            const vStaffId = v.staff_id || v.assigned_staff_id;
            if (vStaffId !== carer.id) return false;
            const vDate = v.scheduled_start ? format(new Date(v.scheduled_start), 'yyyy-MM-dd') : null;
            if (vDate !== shiftDate) return false;
            const vStart = format(new Date(v.scheduled_start), 'HH:mm');
            const vEnd = format(new Date(v.scheduled_end), 'HH:mm');
            return timeOverlaps(vStart, vEnd, shiftStartTime, shiftEndTime);
          });

          if (hasConflict) {
            warnings.push("Has overlapping shift");
            score -= 100;
          }

          // Qualification match (+40 points)
          if (hasRequiredQualification(carer.qualifications, shift.required_qualification)) {
            score += 40;
            reasons.push("Qualified");
          } else if (shift.required_qualification) {
            continue; // Skip - missing required qualification
          }

          // Preferred carer (+30 points)
          if (isPreferredCarer(carer.id, shift.client_id)) {
            score += 30;
            reasons.push("Preferred by client");
          }

          // Proximity score for domiciliary care (+25 max)
          if (shift.care_type === 'domiciliary_care' && client?.address?.postcode) {
            const proximityScore = calculateProximityScore(
              carer.address?.postcode,
              client.address.postcode
            );
            score += (proximityScore / 100) * 25;
            if (proximityScore >= 75) reasons.push("Near client");

            // Check preferred areas from availability settings
            const carerPrefs = carerAvailability.find(a => 
              a.carer_id === carer.id && 
              a.preferred_areas && 
              a.preferred_areas.length > 0
            );
            if (carerPrefs?.preferred_areas) {
              const clientPostcodePrefix = client.address.postcode?.split(' ')[0]?.toUpperCase();
              const isInPreferredArea = carerPrefs.preferred_areas.some(area => 
                clientPostcodePrefix?.startsWith(area.toUpperCase()) ||
                area.toUpperCase() === clientPostcodePrefix
              );
              if (isInPreferredArea) {
                score += 15;
                reasons.push("In preferred area");
              } else {
                score -= 10;
                warnings.push("Outside preferred area");
              }
            }
          }

          // Check vehicle availability for domiciliary
          if (shift.care_type === 'domiciliary_care' && carer.vehicle_type === 'car') {
            score += 5;
            reasons.push("Has vehicle");
          }

          // Workload balance (-points if overworked)
          const workload = getStaffWorkload(carer.id);
          const dayWorkload = getDayWorkload(carer.id, shiftDate);
          const constraints = getCarerHoursConstraints(carer.id);

          // Check max weekly hours
          if (workload + shiftDuration > constraints.maxPerWeek) {
            if (carer.available_for_overtime && workload + shiftDuration <= constraints.maxPerWeek + (carer.overtime_max_hours || 10)) {
              score -= 15;
              warnings.push("Would require overtime");
            } else {
              score -= 100;
              warnings.push(`Exceeds max ${constraints.maxPerWeek}h/week`);
            }
          } else if (workload > 40) {
            score -= 20;
            warnings.push("High workload this week");
          } else if (workload < 20) {
            score += 10;
            reasons.push("Low workload");
          }

          // Check max daily hours
          if (dayWorkload + shiftDuration > constraints.maxPerDay) {
            score -= 50;
            warnings.push(`Exceeds max ${constraints.maxPerDay}h/day`);
          }

          // Employment type preference
          if (carer.employment_type === 'full_time') {
            score += 5;
          }

          // Overtime availability bonus
          if (carer.available_for_overtime && workload >= 35) {
            score += 5;
            reasons.push("Available for overtime");
          }

          if (score > -50) {
            candidateScores.push({
              carer,
              score,
              reasons,
              warnings
            });
          }
        }

        // Sort by score
        candidateScores.sort((a, b) => b.score - a.score);

        if (candidateScores.length === 0) {
          // For gaps, find carers who could potentially cover
          const overtimeCandidates = allCarers.filter(carer => {
            if (isOnLeave(carer.id, shiftDate)) return false;
            const hasConflict = allShifts.some(s => 
              s.carer_id === carer.id &&
              s.date === shiftDate &&
              timeOverlaps(s.start_time, s.end_time, shiftStartTime, shiftEndTime)
            ) || allVisits.some(v => {
              const vStaffId = v.staff_id || v.assigned_staff_id;
              if (vStaffId !== carer.id) return false;
              const vDate = v.scheduled_start ? format(new Date(v.scheduled_start), 'yyyy-MM-dd') : null;
              if (vDate !== shiftDate) return false;
              const vStart = format(new Date(v.scheduled_start), 'HH:mm');
              const vEnd = format(new Date(v.scheduled_end), 'HH:mm');
              return timeOverlaps(vStart, vEnd, shiftStartTime, shiftEndTime);
            });
            if (hasConflict) return false;
            if (!hasRequiredQualification(carer.qualifications, shift.required_qualification)) return false;
            return true;
          }).map(carer => {
            const availability = checkFullAvailability(carer.id, shiftDate, shiftStartTime, shiftEndTime);
            return {
              carer,
              reason: availability.reason || "Not scheduled to work",
              isOvertimeCandidate: carer.available_for_overtime
            };
          });

          detectedGaps.push({
            shift,
            client,
            isVisit,
            reason: "No available staff with required qualifications",
            overtimeCandidates
          });
        } else {
          suggestions.push({
            shift,
            client,
            isVisit,
            candidates: candidateScores.slice(0, 5),
            recommended: candidateScores[0]
          });
        }
      }

      // Detect scheduling conflicts
      const staffShiftMap = {};
      for (const s of allShifts) {
        if (!s.carer_id) continue;
        const key = `${s.carer_id}-${s.date}`;
        if (!staffShiftMap[key]) staffShiftMap[key] = [];
        staffShiftMap[key].push({ ...s, start_time: s.start_time, end_time: s.end_time });
      }
      for (const v of allVisits) {
        const vStaffId = v.staff_id || v.assigned_staff_id;
        if (!vStaffId) continue;
        const vDate = v.scheduled_start ? format(new Date(v.scheduled_start), 'yyyy-MM-dd') : null;
        if (!vDate) continue;
        const key = `${vStaffId}-${vDate}`;
        if (!staffShiftMap[key]) staffShiftMap[key] = [];
        staffShiftMap[key].push({ 
          ...v, 
          date: vDate,
          start_time: format(new Date(v.scheduled_start), 'HH:mm'),
          end_time: format(new Date(v.scheduled_end), 'HH:mm')
        });
      }

      for (const [key, dayShifts] of Object.entries(staffShiftMap)) {
        for (let i = 0; i < dayShifts.length; i++) {
          for (let j = i + 1; j < dayShifts.length; j++) {
            if (timeOverlaps(dayShifts[i].start_time, dayShifts[i].end_time, dayShifts[j].start_time, dayShifts[j].end_time)) {
              detectedConflicts.push({
                staffId: dayShifts[i].carer_id || dayShifts[i].staff_id || dayShifts[i].assigned_staff_id,
                staffName: allCarers.find(c => c.id === (dayShifts[i].carer_id || dayShifts[i].staff_id || dayShifts[i].assigned_staff_id))?.full_name,
                date: dayShifts[i].date,
                shifts: [dayShifts[i], dayShifts[j]]
              });
            }
          }
        }
      }

      // Initialize selected allocations with recommended
      const initialSelected = {};
      suggestions.forEach(s => {
        if (s.recommended) {
          initialSelected[s.shift.id] = s.recommended.carer.id;
        }
      });

      setAllocations(suggestions);
      setConflicts(detectedConflicts);
      setGaps(detectedGaps);
      setSelectedAllocations(initialSelected);

      toast.success("Analysis Complete", `Found ${suggestions.length} allocation suggestions`);
    } catch (error) {
      console.error("AI allocation error:", error);
      toast.error("Analysis Failed", "Could not complete shift analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create overtime/coverage shift requests
  const createOvertimeRequests = async () => {
    const shiftsWithCarers = Object.entries(selectedOvertimeCarers)
      .filter(([_, carerIds]) => carerIds && carerIds.length > 0);
    
    if (shiftsWithCarers.length === 0) {
      toast.error("No Selection", "Please select at least one carer for a shift");
      return;
    }

    setIsAnalyzing(true);
    let successCount = 0;
    const user = await base44.auth.me();

    for (const [shiftId, carerIds] of shiftsWithCarers) {
      const gap = gaps.find(g => g.shift.id === shiftId);
      if (!gap) continue;

      try {
        await base44.entities.ShiftRequest.create({
          shift_id: shiftId,
          requested_by_staff_id: user.id || user.email,
          carer_ids: carerIds,
          client_id: gap.shift.client_id || '',
          shift_date: gap.shift.date,
          start_time: gap.shift.start_time,
          end_time: gap.shift.end_time,
          duration_hours: gap.shift.duration_hours || 0,
          message: overtimeMessage,
          priority: 'high',
          status: 'pending',
          expires_at: new Date(new Date(gap.shift.date).getTime() - 24 * 60 * 60 * 1000).toISOString() // Expires 1 day before shift
        });

        // Create notifications for each carer
        for (const carerId of carerIds) {
          const carer = allCarers.find(c => c.id === carerId);
          if (carer?.email) {
            await base44.entities.Notification.create({
              recipient_email: carer.email,
              title: "Shift Coverage Request",
              message: `You have been asked to cover a shift on ${format(parseISO(gap.shift.date), 'EEE dd MMM')} from ${gap.shift.start_time} to ${gap.shift.end_time}. ${overtimeMessage}`,
              type: "shift_request",
              priority: "high",
              is_read: false,
              related_entity_type: "ShiftRequest",
              related_entity_id: shiftId
            });
          }
        }

        successCount++;
      } catch (error) {
        console.error("Failed to create shift request:", shiftId, error);
      }
    }

    setIsAnalyzing(false);
    setShowOvertimePanel(false);
    setSelectedOvertimeCarers({});
    
    toast.success("Shift Requests Created", `Sent ${successCount} shift request(s) to carers for overtime coverage`);
    queryClient.invalidateQueries({ queryKey: ['shift-requests'] });
  };

  // Apply selected allocations
  const applyAllocations = async () => {
    const toApply = Object.entries(selectedAllocations).filter(([shiftId, carerId]) => carerId);
    
    if (toApply.length === 0) {
      toast.error("No Allocations", "Select at least one carer to allocate");
      return;
    }

    setIsAnalyzing(true);
    let successCount = 0;

    for (const [shiftId, carerId] of toApply) {
      try {
        const allocation = allocations.find(a => a.shift.id === shiftId);
        if (!allocation) continue;

        if (allocation.isVisit) {
          await updateVisitMutation.mutateAsync({
            id: shiftId,
            data: { 
              staff_id: carerId, 
              assigned_staff_id: carerId,
              status: 'published' 
            }
          });
        } else {
          await updateShiftMutation.mutateAsync({
            id: shiftId,
            data: { carer_id: carerId, status: 'scheduled' }
          });
        }
        successCount++;
      } catch (error) {
        console.error("Failed to update:", shiftId, error);
      }
    }

    setIsAnalyzing(false);
    toast.success("Allocations Applied", `Successfully allocated ${successCount} shifts`);
    
    if (onAllocationsApplied) onAllocationsApplied();
    queryClient.invalidateQueries({ queryKey: ['shifts'] });
    queryClient.invalidateQueries({ queryKey: ['visits'] });
  };

  const getQualificationName = (id) => {
    return qualifications.find(q => q.id === id)?.qualification_name || id;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Shift Allocation
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Automatically suggest optimal staff allocations based on availability, qualifications, and preferences
          </p>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Care Type</label>
              <Select value={careType} onValueChange={setCareType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="residential_care">Residential</SelectItem>
                  <SelectItem value="domiciliary_care">Domiciliary</SelectItem>
                  <SelectItem value="supported_living">Supported Living</SelectItem>
                  <SelectItem value="day_centre">Day Centre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={runAIAllocation} 
                disabled={isAnalyzing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          {allocations && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{shifts.length + visits.length}</p>
                  <p className="text-xs text-blue-600">Unfilled Shifts/Visits</p>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" />
                  <p className="text-2xl font-bold text-green-700">{allocations.length}</p>
                  <p className="text-xs text-green-600">Suggestions Ready</p>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto text-orange-600 mb-1" />
                  <p className="text-2xl font-bold text-orange-700">{conflicts.length}</p>
                  <p className="text-xs text-orange-600">Conflicts</p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 mx-auto text-red-600 mb-1" />
                  <p className="text-2xl font-bold text-red-700">{gaps.length}</p>
                  <p className="text-xs text-red-600">Gaps (No Staff)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <Card className="border-orange-300 bg-orange-50 mb-4">
              <CardContent className="p-4">
                <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Scheduling Conflicts Detected
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  {conflicts.slice(0, 3).map((c, idx) => (
                    <li key={idx}>
                      {c.staffName} has overlapping shifts on {format(parseISO(c.date), 'dd MMM')}
                    </li>
                  ))}
                  {conflicts.length > 3 && (
                    <li className="text-orange-600">...and {conflicts.length - 3} more</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Gaps Warning with Overtime Request Option */}
          {gaps.length > 0 && (
            <Card className="border-red-300 bg-red-50 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-red-800 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Staffing Gaps - No Available Staff ({gaps.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => setShowOvertimePanel(!showOvertimePanel)}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {showOvertimePanel ? 'Hide' : 'Request Overtime Coverage'}
                  </Button>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {gaps.slice(0, 3).map((g, idx) => (
                    <li key={idx}>
                      {format(parseISO(g.shift.date), 'dd MMM')} {g.shift.start_time}-{g.shift.end_time}: 
                      {g.client?.full_name || 'Unknown client'} - {g.reason}
                      {g.overtimeCandidates?.filter(c => c.isOvertimeCandidate).length > 0 && (
                        <span className="ml-2 text-orange-600">
                          ({g.overtimeCandidates.filter(c => c.isOvertimeCandidate).length} overtime candidates)
                        </span>
                      )}
                    </li>
                  ))}
                  {gaps.length > 3 && (
                    <li className="text-red-600">...and {gaps.length - 3} more gaps</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Overtime Request Panel */}
          {showOvertimePanel && gaps.length > 0 && (
            <Card className="border-orange-300 bg-orange-50 mb-4">
              <CardContent className="p-4">
                <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                  <Send className="w-4 h-4" />
                  Create Shift Requests for Overtime Coverage
                </h4>
                <p className="text-sm text-orange-700 mb-4">
                  Select carers to send shift requests to. They will receive a notification asking if they can cover these shifts.
                </p>
                
                <div className="mb-4">
                  <label className="text-sm font-medium text-orange-800 block mb-1">Message to carers:</label>
                  <Textarea
                    value={overtimeMessage}
                    onChange={(e) => setOvertimeMessage(e.target.value)}
                    className="bg-white border-orange-200"
                    rows={3}
                  />
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {gaps.map((gap, gapIdx) => {
                    const candidates = gap.overtimeCandidates || [];
                    if (candidates.length === 0) return null;
                    
                    return (
                      <div key={gap.shift.id} className="p-3 bg-white rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">
                              {gap.isVisit ? (
                                <>
                                  {format(new Date(gap.shift.scheduled_start), 'EEE dd MMM')} • {format(new Date(gap.shift.scheduled_start), 'HH:mm')} - {format(new Date(gap.shift.scheduled_end), 'HH:mm')}
                                </>
                              ) : (
                                <>
                                  {format(parseISO(gap.shift.date), 'EEE dd MMM')} • {gap.shift.start_time} - {gap.shift.end_time}
                                </>
                              )}
                            </p>
                            <p className="text-xs text-gray-600">{gap.client?.full_name || gap.shift.location_name}</p>
                            {gap.isVisit && (
                              <Badge className="bg-teal-100 text-teal-800 text-xs">
                                Visit
                              </Badge>
                            )}
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">
                            {candidates.length} potential carers
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {candidates.map((c) => (
                            <label
                              key={c.carer.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded border cursor-pointer text-sm ${
                                selectedOvertimeCarers[gap.shift.id]?.includes(c.carer.id)
                                  ? 'bg-orange-100 border-orange-400'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <Checkbox
                                checked={selectedOvertimeCarers[gap.shift.id]?.includes(c.carer.id) || false}
                                onCheckedChange={(checked) => {
                                  setSelectedOvertimeCarers(prev => {
                                    const current = prev[gap.shift.id] || [];
                                    if (checked) {
                                      return { ...prev, [gap.shift.id]: [...current, c.carer.id] };
                                    } else {
                                      return { ...prev, [gap.shift.id]: current.filter(id => id !== c.carer.id) };
                                    }
                                  });
                                }}
                              />
                              <span>{c.carer.full_name}</span>
                              {c.isOvertimeCandidate && (
                                <Badge className="bg-green-100 text-green-700 text-xs">OT</Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-4 gap-2">
                  <Button variant="outline" onClick={() => setShowOvertimePanel(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={createOvertimeRequests}
                    disabled={Object.values(selectedOvertimeCarers).flat().length === 0 || isAnalyzing}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Create {Object.entries(selectedOvertimeCarers).filter(([_, carers]) => carers?.length > 0).length} Shift Requests
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Allocation Suggestions */}
          {allocations && allocations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Recommended Allocations
              </h3>
              
              {allocations.map((allocation) => (
                <Card key={allocation.shift.id} className="border">
                  <CardContent className="p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedShift(expandedShift === allocation.shift.id ? null : allocation.shift.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {allocation.isVisit ? (
                              <>
                                {format(new Date(allocation.shift.scheduled_start), 'EEE dd MMM')} • {format(new Date(allocation.shift.scheduled_start), 'HH:mm')} - {format(new Date(allocation.shift.scheduled_end), 'HH:mm')}
                              </>
                            ) : (
                              <>
                                {format(parseISO(allocation.shift.date), 'EEE dd MMM')} • {allocation.shift.start_time} - {allocation.shift.end_time}
                              </>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {allocation.client?.full_name || allocation.shift.location_name || 'Unassigned'}
                          </p>
                          {allocation.isVisit && (
                            <Badge className="bg-teal-100 text-teal-800 mt-1 text-xs">
                              Visit
                            </Badge>
                          )}
                          {allocation.shift.required_qualification && (
                            <Badge variant="outline" className="mt-1">
                              <Award className="w-3 h-3 mr-1" />
                              {getQualificationName(allocation.shift.required_qualification)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Select
                          value={selectedAllocations[allocation.shift.id] || ""}
                          onValueChange={(v) => setSelectedAllocations({
                            ...selectedAllocations,
                            [allocation.shift.id]: v
                          })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select carer" />
                          </SelectTrigger>
                          <SelectContent>
                            {allocation.candidates.map((c) => (
                              <SelectItem key={c.carer.id} value={c.carer.id}>
                                <div className="flex items-center gap-2">
                                  {c.carer.full_name}
                                  <span className="text-xs text-gray-500">({c.score}pts)</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {expandedShift === allocation.shift.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedShift === allocation.shift.id && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Top Candidates:</p>
                        <div className="space-y-2">
                          {allocation.candidates.map((candidate, idx) => (
                            <div 
                              key={candidate.carer.id}
                              className={`p-3 rounded-lg border ${
                                selectedAllocations[allocation.shift.id] === candidate.carer.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{candidate.carer.full_name}</span>
                                  {idx === 0 && (
                                    <Badge className="bg-green-100 text-green-800">Recommended</Badge>
                                  )}
                                </div>
                                <Badge variant="outline">{candidate.score} points</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {candidate.reasons.map((r, i) => (
                                  <Badge key={i} className="bg-blue-100 text-blue-800 text-xs">{r}</Badge>
                                ))}
                                {candidate.warnings.map((w, i) => (
                                  <Badge key={i} className="bg-orange-100 text-orange-800 text-xs">{w}</Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {allocations && allocations.length === 0 && gaps.length === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="font-semibold text-green-800">All Shifts Allocated</h3>
                <p className="text-sm text-green-600">No unfilled shifts in the selected period</p>
              </CardContent>
            </Card>
          )}
        </CardContent>

        {/* Footer Actions */}
        {allocations && allocations.length > 0 && (
          <div className="border-t p-4 bg-gray-50 flex justify-between items-center flex-shrink-0">
            <div className="text-sm text-gray-600">
              {Object.values(selectedAllocations).filter(Boolean).length} of {allocations.length} shifts selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAllocations(null)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button 
                onClick={applyAllocations}
                disabled={isAnalyzing || Object.values(selectedAllocations).filter(Boolean).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Apply {Object.values(selectedAllocations).filter(Boolean).length} Allocations
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}