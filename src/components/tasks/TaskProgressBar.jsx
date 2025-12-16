import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

export default function TaskProgressBar({ taskId }) {
  const { data: submissions = [] } = useQuery({
    queryKey: ['task-submission-progress', taskId],
    queryFn: async () => {
      const data = await base44.entities.FormSubmission.filter({ 
        staff_task_id: taskId,
        status: 'draft'
      });
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 10000
  });

  if (submissions.length === 0) return null;

  const draft = submissions[0];
  const progress = draft.progress_percentage || 0;

  return (
    <div className="p-2 bg-blue-50 rounded">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-blue-700">Draft in Progress</span>
        <span className="text-xs font-bold text-blue-700">{progress}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}