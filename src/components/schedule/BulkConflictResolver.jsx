import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, Check, X, Send, Loader2, ChevronRight, AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { checkCarerAvailability } from "@/components/availability/AvailabilityChecker";
import { useToast } from "@/components/ui/toast";

export default function BulkConflictResolver({ 
  conflicts = [],
  carers = [],
  shifts = [],
  carerAvailability = [],
  leaveRequests = [],
  onResolve,
  onClose
}) {
  const [solutions, setSolutions] = useState({});
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedSolutions, setSelectedSolutions] = useState({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    generateAllSolutions();
  }, [conflicts]);

  const generateAllSolutions = async () => {
    setIsGenerating(true);
    const allSolutions = {};

    conflicts.forEach((conflict, idx) => {
      const conflictSolutions = generateSolutionsForConflict(conflict);
      allSolutions[idx] = conflictSolutions;
      // Auto-select best solution
      if (conflictSolutions.length > 0) {
        setSelectedSolutions(prev => ({ ...prev, [idx]: conflictSolutions[0] }));
      }
    });

    setSolutions(allSolutions);
    setIsGenerating(false);
  };

  const generateSolutionsForConflict = (conflict) => {
    const solutions = [];
    const conflictShifts = conflict.shifts || 
      [conflict.shift, conflict.shift1, conflict.shift2].filter(Boolean);

    if (!conflictShifts.length) return solutions;

    conflictShifts.forEach(shift => {
      if (!shift) return;
      const alternatives = findAlternativeCarers(shift, conflict);
      
      alternatives.slice(0, 2).forEach((alt, idx) => {
        solutions.push({
          id: `${conflict.type}-${shift.id}-${idx}`,
          shift,
          toCarer: alt.carer,
          score: alt.score,
          reason: alt.reason,
          fromCarer: conflict.carer
        });
      });
    });

    return solutions.sort((a, b) => b.score - a.score);
  };

  const findAlternativeCarers = (shift, conflict) => {
    if (!shift) return [];
    const alternatives = [];

    carers.forEach(carer => {
      if (!carer || carer.status !== 'active') return;
      if (carer.id === shift.carer_id) return;

      const availCheck = checkCarerAvailability(
        carer.id, shift.date, shift.start_time, shift.end_time,
        carerAvailability, leaveRequests
      );

      if (!availCheck.isAvailable) return;

      let score = 40;
      const reasons = [];

      const dayShifts = shifts.filter(s => 
        s?.carer_id === carer.id && s?.date === shift.date && s?.id !== shift.id
      );
      const totalHours = dayShifts.reduce((sum, s) => sum + (s?.duration_hours || 0), 0);
      
      if (totalHours === 0) {
        score += 15;
        reasons.push("Unscheduled");
      } else if (totalHours < 6) {
        score += 10;
        reasons.push("Has capacity");
      }

      if (shift.client_id && carer.preferred_clients?.includes(shift.client_id)) {
        score += 20;
        reasons.push("Preferred");
      }

      if (totalHours >= 8) score -= 10;

      alternatives.push({
        carer,
        score,
        reason: reasons.join(" • ") || "Available",
        currentHours: totalHours
      });
    });

    return alternatives.sort((a, b) => b.score - a.score);
  };

  const applyAllMutation = useMutation({
    mutationFn: async () => {
      const updates = [];
      
      Object.entries(selectedSolutions).forEach(([idx, solution]) => {
        if (solution && solution.shift && solution.toCarer) {
          updates.push(
            base44.entities.Shift.update(solution.shift.id, {
              carer_id: solution.toCarer.id,
              status: "scheduled"
            })
          );
        }
      });

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success("Resolved", `${Object.keys(selectedSolutions).length} conflicts resolved`);
      onResolve?.();
    },
    onError: (error) => {
      toast.error("Error", "Failed to apply some solutions");
      console.error(error);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  Bulk AI Resolver
                </h2>
                <p className="text-gray-600">Smart solutions for {conflicts.length} conflicts</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Analyzing conflicts and finding solutions...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict, idx) => {
                const conflictSolutions = solutions[idx] || [];
                const selected = selectedSolutions[idx];

                return (
                  <div key={idx} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 bg-orange-50 border-b">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <p className="text-sm font-medium text-orange-900">{conflict.message}</p>
                      </div>
                    </div>
                    
                    {conflictSolutions.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No alternative solutions available
                      </div>
                    ) : (
                      <div className="p-4 space-y-2">
                        {conflictSolutions.map((solution) => (
                          <div
                            key={solution.id}
                            onClick={() => setSelectedSolutions(prev => ({ ...prev, [idx]: solution }))}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              selected?.id === solution.id
                                ? "border-purple-500 bg-purple-50"
                                : "border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">
                                  Reassign to {solution.toCarer.full_name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {solution.shift.start_time}-{solution.shift.end_time} • {solution.reason}
                                </p>
                                <Badge className="mt-2 bg-blue-100 text-blue-800">
                                  Score: {solution.score}
                                </Badge>
                              </div>
                              {selected?.id === solution.id && (
                                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isGenerating && (
          <div className="p-6 border-t bg-gray-50 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => applyAllMutation.mutate()}
              disabled={Object.keys(selectedSolutions).length === 0 || applyAllMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {applyAllMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Apply {Object.keys(selectedSolutions).length} Solutions
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}