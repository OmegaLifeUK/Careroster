import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Sparkles, Brain, Clock, Users, ChevronRight, 
  Check, X, Send, Loader2, TrendingUp, Target, Zap
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { checkCarerAvailability } from "@/components/availability/AvailabilityChecker";
import { useToast } from "@/components/ui/toast";

/**
 * Intelligent Conflict Resolver with AI-powered suggestions
 * Provides smart solutions for overallocation, overlaps, and scheduling conflicts
 */
export default function IntelligentConflictResolver({ 
  conflict,
  carers = [],
  shifts = [],
  carerAvailability = [],
  leaveRequests = [],
  onResolve,
  onClose
}) {
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [isGeneratingSolutions, setIsGeneratingSolutions] = useState(false);
  const [aiSolutions, setAiSolutions] = useState([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all shifts involved in this conflict
  const conflictShifts = useMemo(() => {
    const shiftList = [];
    if (conflict.shifts && Array.isArray(conflict.shifts)) {
      return conflict.shifts;
    }
    if (conflict.shift) shiftList.push(conflict.shift);
    if (conflict.shift1) shiftList.push(conflict.shift1);
    if (conflict.shift2) shiftList.push(conflict.shift2);
    return shiftList;
  }, [conflict]);

  // Find the carer involved
  const conflictCarer = useMemo(() => {
    if (conflict.carerId) {
      return carers.find(c => c?.id === conflict.carerId);
    }
    if (conflict.shift?.carer_id) {
      return carers.find(c => c?.id === conflict.shift.carer_id);
    }
    if (conflict.shift1?.carer_id) {
      return carers.find(c => c?.id === conflict.shift1.carer_id);
    }
    return null;
  }, [conflict, carers]);

  // Generate smart solutions
  const generateSolutions = async () => {
    setIsGeneratingSolutions(true);
    const solutions = [];

    // For overallocation: find alternative carers for each shift
    if (conflict.type === "overallocation") {
      for (const shift of conflictShifts) {
        const alternatives = findAlternativeCarers(shift);
        
        alternatives.slice(0, 3).forEach((alt, idx) => {
          solutions.push({
            id: `reallocate-${shift.id}-${idx}`,
            type: "reallocate",
            priority: idx === 0 ? "high" : "medium",
            shift,
            fromCarer: conflictCarer,
            toCarer: alt.carer,
            reason: alt.reason,
            score: alt.score,
            action: "Reassign shift",
            description: `Move ${shift.start_time}-${shift.end_time} shift from ${conflictCarer?.full_name} to ${alt.carer.full_name}`,
            benefits: [
              `${alt.carer.full_name} is available`,
              `Reduces ${conflictCarer?.full_name}'s hours to acceptable level`,
              alt.reason
            ]
          });
        });
      }
    }

    // For overlap: unassign one shift and find replacement
    if (conflict.type === "overlap" && conflict.shift2) {
      const alternatives = findAlternativeCarers(conflict.shift2);
      
      alternatives.slice(0, 3).forEach((alt, idx) => {
        solutions.push({
          id: `resolve-overlap-${idx}`,
          type: "reallocate",
          priority: idx === 0 ? "high" : "medium",
          shift: conflict.shift2,
          fromCarer: conflictCarer,
          toCarer: alt.carer,
          reason: alt.reason,
          score: alt.score,
          action: "Resolve overlap",
          description: `Reassign ${conflict.shift2.start_time}-${conflict.shift2.end_time} to ${alt.carer.full_name}`,
          benefits: [
            "Eliminates shift overlap",
            `${alt.carer.full_name} is available`,
            alt.reason
          ]
        });
      });
    }

    // Sort by score
    solutions.sort((a, b) => b.score - a.score);
    
    setAiSolutions(solutions);
    setIsGeneratingSolutions(false);
  };

  // Find alternative carers using smart scoring
  const findAlternativeCarers = (shift) => {
    if (!shift) return [];

    const alternatives = [];

    carers.forEach(carer => {
      if (!carer || carer.status !== 'active') return;
      if (carer.id === shift.carer_id) return; // Skip current carer

      let score = 0;
      const reasons = [];

      // Check availability
      const availCheck = checkCarerAvailability(
        carer.id,
        shift.date,
        shift.start_time,
        shift.end_time,
        carerAvailability,
        leaveRequests
      );

      if (!availCheck.isAvailable) return; // Must be available

      score += 40; // Base score for being available

      // Check if they have preferred this client
      const client = shift.client_id;
      if (client && carer.preferred_clients?.includes(client)) {
        score += 20;
        reasons.push("Preferred carer for this client");
      }

      // Check proximity (if addresses available)
      // Score += proximity bonus

      // Check current workload
      const dayShifts = shifts.filter(s => 
        s?.carer_id === carer.id && s?.date === shift.date
      );
      const totalHours = dayShifts.reduce((sum, s) => sum + (s?.duration_hours || 0), 0);
      
      if (totalHours === 0) {
        score += 15;
        reasons.push("Currently unscheduled this day");
      } else if (totalHours < 6) {
        score += 10;
        reasons.push("Has capacity for more hours");
      } else if (totalHours < 8) {
        score += 5;
      }

      // Check for qualifications match
      const requiredQual = shift.required_qualification;
      if (requiredQual && carer.qualifications?.includes(requiredQual)) {
        score += 15;
        reasons.push("Has required qualifications");
      }

      // Check employment type
      if (carer.employment_type === 'bank' && totalHours < 4) {
        score += 8;
        reasons.push("Bank staff with availability");
      }

      // Penalize if they're working close to limit
      if (totalHours >= 8) {
        score -= 10;
      }

      alternatives.push({
        carer,
        score,
        reason: reasons.join(" • ") || "Available for this shift",
        currentHours: totalHours
      });
    });

    return alternatives.sort((a, b) => b.score - a.score);
  };

  // Apply solution mutation
  const applySolutionMutation = useMutation({
    mutationFn: async (solution) => {
      if (!solution || !solution.shift || !solution.toCarer) {
        throw new Error("Invalid solution data");
      }

      if (solution.type === "reallocate") {
        // Update shift with new carer
        await base44.entities.Shift.update(solution.shift.id, {
          carer_id: solution.toCarer.id,
          status: "scheduled"
        });

        // Send notification to new carer
        try {
          await base44.entities.Notification.create({
            recipient_email: solution.toCarer.email,
            title: "New Shift Assigned",
            message: `You have been assigned a shift on ${format(parseISO(solution.shift.date), "MMM d")} from ${solution.shift.start_time} to ${solution.shift.end_time}`,
            type: "shift_assignment",
            priority: "medium",
            related_entity_type: "shift",
            related_entity_id: solution.shift.id
          });
        } catch (notifError) {
          console.log("Notification failed but shift updated:", notifError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success("Resolved", "Conflict successfully resolved");
      onResolve?.();
    },
    onError: (error) => {
      console.error("Apply solution error:", error);
      toast.error("Error", error.message || "Failed to apply solution");
    }
  });

  // Send offer to carer
  const sendOfferMutation = useMutation({
    mutationFn: async (solution) => {
      // Create shift request
      await base44.entities.StaffMessage.create({
        recipient_email: solution.toCarer.email,
        sender_name: "Scheduling System",
        subject: `Shift Offer - ${format(parseISO(solution.shift.date), "MMM d")}`,
        message: `We'd like to offer you a shift on ${format(parseISO(solution.shift.date), "EEE, MMM d")} from ${solution.shift.start_time} to ${solution.shift.end_time}.\n\nThis shift is currently causing a scheduling conflict and you've been identified as a great fit.\n\nPlease confirm your availability.`,
        message_type: "shift_offer",
        priority: "high",
        requires_response: true,
        related_shift_id: solution.shift.id
      });
    },
    onSuccess: () => {
      toast.success("Offer Sent", "Shift offer sent to carer");
    },
    onError: () => {
      toast.error("Error", "Failed to send offer");
    }
  });

  React.useEffect(() => {
    generateSolutions();
  }, [conflict]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-green-100 text-green-800 border-green-300";
      case "medium": return "bg-blue-100 text-blue-800 border-blue-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return <TrendingUp className="w-4 h-4" />;
      case "medium": return <Target className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  AI Conflict Resolver
                </h2>
                <p className="text-gray-600">Smart solutions for scheduling conflicts</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Conflict Summary */}
        <div className="p-6 border-b bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-orange-900 mb-1">Conflict Details</p>
              <p className="text-sm text-orange-800">{conflict.message}</p>
              {conflictCarer && (
                <p className="text-sm text-orange-700 mt-2">
                  <strong>Carer:</strong> {conflictCarer.full_name}
                </p>
              )}
              {conflict.totalHours && (
                <p className="text-sm text-orange-700">
                  <strong>Total Hours:</strong> {conflict.totalHours.toFixed(1)}h (exceeds recommended limit)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* AI Solutions */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recommended Solutions
            </h3>
            {isGeneratingSolutions && (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin ml-2" />
            )}
          </div>

          {isGeneratingSolutions ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Analyzing scheduling options...</p>
              </div>
            </div>
          ) : aiSolutions.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No alternative solutions available</p>
              <p className="text-sm text-gray-500 mt-1">
                You may need to manually adjust the schedule
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiSolutions.map((solution, idx) => (
                <div
                  key={solution.id}
                  className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    selectedSolution?.id === solution.id
                      ? "border-purple-500 bg-purple-50 shadow-lg"
                      : "border-gray-200 hover:border-purple-300 hover:shadow-md"
                  }`}
                  onClick={() => setSelectedSolution(solution)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? "bg-purple-600 text-white" :
                      idx === 1 ? "bg-purple-400 text-white" :
                      "bg-gray-300 text-gray-700"
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(solution.priority)}>
                          {getPriorityIcon(solution.priority)}
                          <span className="ml-1">{solution.priority.toUpperCase()}</span>
                        </Badge>
                        <Badge variant="outline" className="bg-white">
                          Match Score: {solution.score}
                        </Badge>
                      </div>

                      <p className="font-semibold text-gray-900 mb-1">
                        {solution.description}
                      </p>

                      <div className="text-sm text-gray-600 space-y-1 mt-2">
                        {solution.benefits.map((benefit, bidx) => (
                          <div key={bidx} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>

                      {solution.toCarer && (
                        <div className="mt-3 p-2 bg-white border rounded text-sm">
                          <strong>{solution.toCarer.full_name}</strong>
                          <span className="text-gray-600 ml-2">
                            • Currently: {solution.toCarer.currentHours || 0}h scheduled
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedSolution?.id === solution.id && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isGeneratingSolutions && aiSolutions.length > 0 && (
          <div className="p-6 border-t bg-gray-50 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => sendOfferMutation.mutate(selectedSolution)}
              disabled={!selectedSolution || sendOfferMutation.isPending}
              variant="outline"
              className="flex-1 border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendOfferMutation.isPending ? "Sending..." : "Send Offer"}
            </Button>
            <Button
              onClick={() => applySolutionMutation.mutate(selectedSolution)}
              disabled={!selectedSolution || applySolutionMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {applySolutionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Apply Solution
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}