import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Users, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

/**
 * Smart helper that detects when automation can help and offers to execute it
 */
export default function AutoScheduleHelper() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['auto-schedule-suggestions'],
    queryFn: async () => {
      const suggestions = [];
      
      // Check for new carers without availability
      const carers = await base44.entities.Carer.list();
      const availability = await base44.entities.CarerAvailability.list();
      
      const carersWithoutAvailability = carers.filter(c => 
        c.status === 'active' && 
        !availability.some(a => a.carer_id === c.id)
      );
      
      if (carersWithoutAvailability.length > 0) {
        suggestions.push({
          type: 'setup_availability',
          title: `${carersWithoutAvailability.length} carer(s) need availability setup`,
          description: 'Set up default working hours to enable scheduling',
          carers: carersWithoutAvailability,
          action: 'setup_carer_availability'
        });
      }
      
      // Check for care plans without shifts
      const carePlans = await base44.entities.CarePlan.filter({ status: 'active' });
      const shifts = await base44.entities.Shift.list();
      
      const plansWithoutShifts = [];
      for (const plan of carePlans) {
        const clientShifts = shifts.filter(s => s.client_id === plan.client_id);
        const hasDailyTasks = (plan.care_tasks || []).some(t => 
          t.is_active && (t.frequency === 'daily' || t.frequency === 'with_each_visit')
        );
        
        if (hasDailyTasks && clientShifts.length === 0) {
          plansWithoutShifts.push(plan);
        }
      }
      
      if (plansWithoutShifts.length > 0) {
        suggestions.push({
          type: 'generate_shifts',
          title: `${plansWithoutShifts.length} care plan(s) ready for shift generation`,
          description: 'Auto-create shifts based on care plan tasks',
          plans: plansWithoutShifts,
          action: 'generate_shifts_from_plans'
        });
      }
      
      return suggestions;
    },
    refetchInterval: 60000 // Check every minute
  });

  const executeAction = async (suggestion) => {
    setIsProcessing(true);
    try {
      if (suggestion.action === 'setup_carer_availability') {
        // Setup availability for all carers
        for (const carer of suggestion.carers) {
          const defaultHours = carer.employment_type === 'full_time' 
            ? { start: "08:00", end: "18:00" }
            : { start: "09:00", end: "15:00" };
          
          const workingDays = [1, 2, 3, 4, 5];
          await Promise.all(workingDays.map(day => 
            base44.entities.CarerAvailability.create({
              carer_id: carer.id,
              availability_type: "working_hours",
              day_of_week: day,
              start_time: defaultHours.start,
              end_time: defaultHours.end,
              is_recurring: true,
              notes: "Auto-generated"
            })
          ));
        }
        
        toast.success("Availability Setup", `Configured ${suggestion.carers.length} carer(s)`);
        queryClient.invalidateQueries();
      } else if (suggestion.action === 'generate_shifts_from_plans') {
        // Import the function
        const { generateShiftsFromCarePlan } = await import("@/components/workflow/AutomatedWorkflowEngine");
        
        let totalCreated = 0;
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        for (const plan of suggestion.plans) {
          const result = await generateShiftsFromCarePlan(plan.id, plan.client_id, today, nextWeek);
          totalCreated += result.created || 0;
        }
        
        if (totalCreated > 0) {
          toast.success("Shifts Generated", `Created ${totalCreated} shifts from ${suggestion.plans.length} care plan(s)`);
          queryClient.invalidateQueries({ queryKey: ['shifts'] });
        }
      }
    } catch (err) {
      console.error("Action failed:", err);
      toast.error("Action Failed", "Could not complete automation");
    } finally {
      setIsProcessing(false);
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
              Smart Automation Available
              <Badge className="bg-purple-600 text-white">AI</Badge>
            </h3>
            <div className="space-y-2">
              {suggestions.map((sug, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/70 p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{sug.title}</p>
                    <p className="text-xs text-gray-600">{sug.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => executeAction(sug)}
                    disabled={isProcessing}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {isProcessing ? "Processing..." : "Auto-Fix"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}