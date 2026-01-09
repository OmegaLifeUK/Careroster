import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, CheckCircle, Circle, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, addYears } from "date-fns";

const MANDATORY_TRAINING = [
  { name: "Safeguarding Adults", expiry_years: 1 },
  { name: "Safeguarding Children", expiry_years: 1 },
  { name: "Health & Safety", expiry_years: 1 },
  { name: "Infection Control", expiry_years: 1 },
  { name: "Moving & Handling", expiry_years: 1 },
  { name: "Medication Awareness", expiry_years: 1 },
  { name: "GDPR & Confidentiality", expiry_years: 1 },
  { name: "First Aid / BLS", expiry_years: 3 }
];

export default function MandatoryTrainingTracker({ staffId, trainingRecords = [], onComplete }) {
  const [addingTraining, setAddingTraining] = useState(null);
  const [completionDate, setCompletionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addTrainingMutation = useMutation({
    mutationFn: async (trainingName) => {
      const training = MANDATORY_TRAINING.find(t => t.name === trainingName);
      const expiryDate = format(addYears(new Date(completionDate), training.expiry_years), 'yyyy-MM-dd');

      return base44.entities.TrainingAssignment.create({
        staff_id: staffId,
        training_name: trainingName,
        status: 'completed',
        completion_date: completionDate,
        expiry_date: expiryDate,
        training_type: 'mandatory'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-onboarding'] });
      toast.success("Added", "Training record added");
      setAddingTraining(null);
      setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
    }
  });

  const completedCount = MANDATORY_TRAINING.filter(mt => 
    trainingRecords.some(tr => tr.training_name === mt.name && tr.status === 'completed')
  ).length;

  const progress = (completedCount / MANDATORY_TRAINING.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-purple-600" />
          Mandatory Training ({completedCount}/{MANDATORY_TRAINING.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="space-y-2">
          {MANDATORY_TRAINING.map(mt => {
            const record = trainingRecords.find(tr => tr.training_name === mt.name && tr.status === 'completed');
            const isComplete = !!record;
            const isAdding = addingTraining === mt.name;

            return (
              <div key={mt.name}>
                <div 
                  className={`p-3 rounded border flex items-center justify-between ${
                    isComplete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                    <div>
                      <p className="font-medium">{mt.name}</p>
                      {record && (
                        <p className="text-xs text-gray-600">
                          Completed: {format(new Date(record.completion_date), 'dd/MM/yyyy')}
                          {record.expiry_date && ` • Expires: ${format(new Date(record.expiry_date), 'dd/MM/yyyy')}`}
                        </p>
                      )}
                    </div>
                  </div>
                  {!isComplete && (
                    <Button 
                      size="sm" 
                      onClick={() => setAddingTraining(mt.name)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Record
                    </Button>
                  )}
                </div>

                {isAdding && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <Label className="text-sm">Completion Date</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="date"
                        value={completionDate}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={() => addTrainingMutation.mutate(mt.name)}
                        disabled={addTrainingMutation.isPending}
                      >
                        {addTrainingMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setAddingTraining(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {completedCount === MANDATORY_TRAINING.length && (
          <div className="p-3 bg-green-50 rounded border border-green-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">
              All mandatory training completed!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}