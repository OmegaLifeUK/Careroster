
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, Calendar, Users, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addDays, parseISO } from "date-fns";

export default function AIScheduleGenerator({ onClose, shifts = [], carers = [], clients = [] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createShiftMutation = useMutation({
    mutationFn: (shiftData) => base44.entities.Shift.create(shiftData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  // Smart scheduling algorithm
  const generateSmartSuggestions = async () => {
    setIsGenerating(true);
    const newSuggestions = [];

    try {
      if (!Array.isArray(shifts) || !Array.isArray(carers) || !Array.isArray(clients)) {
        throw new Error("Invalid data: shifts, carers, or clients are not arrays.");
      }

      // 1. Find unfilled shifts
      const unfilledShifts = shifts.filter(s => s && (!s.carer_id || s.status === 'unfilled'));
      
      for (const shift of unfilledShifts) {
        if (!shift) continue; // Ensure shift object is not null/undefined
        
        const client = clients.find(c => c && c.id === shift.client_id);
        if (!client) continue; // Ensure client object is not null/undefined

        // Find best matching carers
        const availableCarers = carers.filter(carer => {
          if (!carer || carer.status !== 'active') return false; // Ensure carer object is not null/undefined and active

          // Check if carer has conflicting shifts
          const carerShifts = shifts.filter(s => 
            s && s.carer_id === carer.id && // Ensure shift object is not null/undefined
            s.date === shift.date
          );

          const hasConflict = carerShifts.some(cs => {
            if (!cs) return false; // Ensure conflicting shift object is not null/undefined
            const start1 = shift.start_time || "00:00";
            const end1 = shift.end_time || "23:59";
            const start2 = cs.start_time || "00:00";
            const end2 = cs.end_time || "23:59";

            return (
              (start1 >= start2 && start1 < end2) ||
              (end1 > start2 && end1 <= end2) ||
              (start1 <= start2 && end1 >= end2)
            );
          });

          if (hasConflict) return false;

          // Check total hours for the day
          const totalHours = carerShifts.reduce((sum, s) => sum + (s?.duration_hours || 0), 0);
          if (totalHours + (shift.duration_hours || 0) > 10) return false;

          return true;
        });

        // Score carers based on preferences and qualifications
        const scoredCarers = availableCarers.map(carer => {
          let score = 0;

          // Preferred carer bonus
          if (Array.isArray(client.preferred_carers) && client.preferred_carers.includes(carer.id)) {
            score += 50;
          }

          // Qualification match
          if (shift.required_qualification && Array.isArray(carer.qualifications) && carer.qualifications.includes(shift.required_qualification)) {
            score += 30;
          }

          // Previous experience with client
          const pastShifts = shifts.filter(s => 
            s && s.carer_id === carer.id && // Ensure shift object is not null/undefined
            s.client_id === shift.client_id &&
            s.status === 'completed'
          );
          score += Math.min(pastShifts.length * 5, 20);

          // Workload balance (prefer carers with fewer shifts)
          const carerShiftCount = shifts.filter(s => s && s.carer_id === carer.id).length; // Ensure shift object is not null/undefined
          score += Math.max(0, 20 - carerShiftCount);

          return { carer, score };
        });

        scoredCarers.sort((a, b) => (b?.score || 0) - (a?.score || 0)); // Add null/undefined checks for a and b scores

        if (scoredCarers.length > 0) {
          const bestMatch = scoredCarers[0];
          newSuggestions.push({
            type: 'assignment',
            shift,
            carer: bestMatch.carer,
            client,
            score: bestMatch.score,
            reasons: [
              Array.isArray(client.preferred_carers) && client.preferred_carers.includes(bestMatch.carer.id) && "Preferred carer",
              shift.required_qualification && Array.isArray(bestMatch.carer.qualifications) && bestMatch.carer.qualifications.includes(shift.required_qualification) && "Has required qualification",
              "Available and no conflicts",
              bestMatch.score > 50 && "High compatibility score"
            ].filter(Boolean)
          });
        } else {
          newSuggestions.push({
            type: 'warning',
            shift,
            client,
            message: "No available carers found - consider adjusting shift time or recruiting"
          });
        }
      }

      // 2. Suggest optimization for existing assignments
      const assignedShifts = shifts.filter(s => s && s.carer_id && s.status !== 'completed'); // Ensure shift object is not null/undefined
      
      for (const shift of assignedShifts.slice(0, 5)) { // Limit to 5 suggestions
        if (!shift) continue; // Ensure shift object is not null/undefined

        const currentCarer = carers.find(c => c && c.id === shift.carer_id); // Ensure carer object is not null/undefined
        const client = clients.find(c => c && c.id === shift.client_id); // Ensure client object is not null/undefined
        
        if (!currentCarer || !client) continue;

        // Check if there's a better match
        const betterCarers = carers.filter(carer => {
          if (!carer || carer.id === shift.carer_id) return false; // Ensure carer object is not null/undefined
          if (carer.status !== 'active') return false;
          if (!Array.isArray(client.preferred_carers) || !client.preferred_carers.includes(carer.id)) return false; // Add Array.isArray check

          // Check availability
          const carerShifts = shifts.filter(s => 
            s && s.carer_id === carer.id && // Ensure shift object is not null/undefined
            s.date === shift.date
          );

          const hasConflict = carerShifts.some(cs => {
            if (!cs) return false; // Ensure conflicting shift object is not null/undefined
            const start1 = shift.start_time || "00:00";
            const end1 = shift.end_time || "23:59";
            const start2 = cs.start_time || "00:00";
            const end2 = cs.end_time || "23:59";

            return (start1 >= start2 && start1 < end2) ||
                   (end1 > start2 && end1 <= end2) ||
                   (start1 <= start2 && end1 >= end2);
          });

          return !hasConflict;
        });

        if (betterCarers.length > 0 && !(Array.isArray(client.preferred_carers) && client.preferred_carers.includes(currentCarer.id))) { // Add Array.isArray check
          newSuggestions.push({
            type: 'optimization',
            shift,
            currentCarer,
            suggestedCarer: betterCarers[0],
            client,
            reasons: ["Suggested carer is client's preferred choice", "Improves continuity of care"]
          });
        }
      }

      setSuggestions(newSuggestions);
      toast({
        title: "AI Analysis Complete",
        description: `Found ${newSuggestions.length} suggestions to improve your schedule`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to generate suggestions: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestions = async () => {
    const selected = suggestions.filter((_, idx) => selectedSuggestions.has(idx));
    
    setIsGenerating(true);
    try {
      for (const suggestion of selected) {
        if (!suggestion) continue; // Ensure suggestion object is not null/undefined
        
        if (suggestion.type === 'assignment' && suggestion.shift && suggestion.carer) {
          await updateShiftMutation.mutateAsync({
            id: suggestion.shift.id,
            data: {
              carer_id: suggestion.carer.id,
              status: 'scheduled'
            }
          });
        } else if (suggestion.type === 'optimization' && suggestion.shift && suggestion.suggestedCarer) {
          await updateShiftMutation.mutateAsync({
            id: suggestion.shift.id,
            data: {
              carer_id: suggestion.suggestedCarer.id
            }
          });
        }
      }

      toast({
        title: "Suggestions Applied",
        description: `Successfully updated ${selected.length} shift${selected.length > 1 ? 's' : ''}`,
        variant: "success",
      });
      onClose();
    } catch (error) {
      console.error("Error applying suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to apply some suggestions: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSuggestion = (index) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI Schedule Assistant</CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  Smart suggestions to optimize your schedule
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto flex-1">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ready to optimize your schedule?
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Our AI will analyze your shifts, carers, and clients to provide smart scheduling suggestions
              </p>
              <Button
                onClick={generateSmartSuggestions}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {suggestions.length} Suggestion{suggestions.length > 1 ? 's' : ''} Found
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedSuggestions.size} selected for application
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSuggestions(new Set())}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {suggestions.map((suggestion, idx) => (
                  <Card
                    key={idx}
                    className={`cursor-pointer transition-all ${
                      selectedSuggestions.has(idx)
                        ? 'ring-2 ring-purple-500 bg-purple-50'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => suggestion.type !== 'warning' && toggleSuggestion(idx)}
                  >
                    <CardContent className="p-4">
                      {suggestion.type === 'assignment' && (
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedSuggestions.has(idx)
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedSuggestions.has(idx) && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-green-100 text-green-800">Assignment</Badge>
                              <Badge className="bg-blue-100 text-blue-800">
                                Score: {suggestion.score}
                              </Badge>
                            </div>
                            <p className="font-semibold text-gray-900 mb-2">
                              Assign {suggestion.carer.full_name} to {suggestion.client.full_name}
                            </p>
                            <div className="text-sm text-gray-600 space-y-1 mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {suggestion.shift.date} at {suggestion.shift.start_time}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {suggestion.shift.duration_hours}h shift
                              </div>
                            </div>
                            <div className="space-y-1">
                              {suggestion.reasons.map((reason, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-green-700">
                                  <CheckCircle className="w-3 h-3" />
                                  {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {suggestion.type === 'optimization' && (
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedSuggestions.has(idx)
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedSuggestions.has(idx) && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-blue-100 text-blue-800">Optimization</Badge>
                            </div>
                            <p className="font-semibold text-gray-900 mb-2">
                              Reassign from {suggestion.currentCarer.full_name} to {suggestion.suggestedCarer.full_name}
                            </p>
                            <div className="text-sm text-gray-600 mb-3">
                              Client: {suggestion.client.full_name} • {suggestion.shift.date}
                            </div>
                            <div className="space-y-1">
                              {suggestion.reasons.map((reason, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-blue-700">
                                  <CheckCircle className="w-3 h-3" />
                                  {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {suggestion.type === 'warning' && (
                        <div className="flex items-start gap-4">
                          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-orange-100 text-orange-800">Attention Needed</Badge>
                            </div>
                            <p className="font-semibold text-gray-900 mb-2">
                              {suggestion.client.full_name} - {suggestion.shift.date} at {suggestion.shift.start_time}
                            </p>
                            <p className="text-sm text-gray-700">{suggestion.message}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={generateSmartSuggestions}
                  disabled={isGenerating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleApplySuggestions}
                  disabled={selectedSuggestions.size === 0 || isGenerating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      Apply {selectedSuggestions.size} Suggestion{selectedSuggestions.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
