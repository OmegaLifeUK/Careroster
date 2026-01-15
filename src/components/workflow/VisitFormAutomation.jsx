import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

// Map visit types to form categories
const VISIT_TYPE_FORM_MAPPING = {
  'assessment': 'assessment',
  'care_assessment': 'assessment',
  'pre_admission': 'assessment',
  'initial': 'assessment',
  'review': 'care_plan'
};

export default function VisitFormAutomation() {
  const { data: visits = [] } = useQuery({
    queryKey: ['visits-needing-forms'],
    queryFn: async () => {
      const relevantTypes = Object.keys(VISIT_TYPE_FORM_MAPPING);
      const allVisits = await base44.entities.Visit.list('-created_date', 100);
      return Array.isArray(allVisits) 
        ? allVisits.filter(v => 
            relevantTypes.includes(v.visit_type) && 
            (v.status === 'draft' || v.status === 'published')
          )
        : [];
    },
    refetchInterval: 30000 // Check every 30 seconds
  });

  const { data: existingTasks = [] } = useQuery({
    queryKey: ['staff-tasks-for-visits'],
    queryFn: async () => {
      const tasks = await base44.entities.StaffTask.list('-created_date', 500);
      return Array.isArray(tasks) ? tasks : [];
    },
    refetchInterval: 30000
  });

  const { data: formTemplates = [] } = useQuery({
    queryKey: ['form-templates-for-automation'],
    queryFn: async () => {
      const templates = await base44.entities.FormTemplate.filter({ is_active: true });
      return Array.isArray(templates) ? templates : [];
    }
  });

  useEffect(() => {
    const processVisits = async () => {
      if (!visits.length || !formTemplates.length) return;

      for (const visit of visits) {
        try {
          // Check if task already exists for this visit
          const taskExists = existingTasks.some(t => 
            t.linked_shift_id === visit.id || 
            (t.subject_client_id === visit.client_id && 
             t.assigned_to_staff_id === visit.assigned_staff_id &&
             t.scheduled_date === visit.scheduled_start?.split('T')[0])
          );

          if (taskExists) continue;

          // Find appropriate form template
          const formCategory = VISIT_TYPE_FORM_MAPPING[visit.visit_type];
          const template = formTemplates.find(t => 
            t.category === formCategory || 
            t.form_name?.toLowerCase().includes(visit.visit_type)
          );

          if (!template || !visit.assigned_staff_id) continue;

          // Get client info for better task naming
          let clientName = "Client";
          try {
            const client = await base44.entities.Client.filter({ id: visit.client_id });
            if (client && client[0]) {
              clientName = client[0].full_name;
            }
          } catch (e) {
            console.log("Could not fetch client name");
          }

          // Create staff task
          const taskData = {
            title: `${template.form_name} - ${clientName}`,
            description: `Complete ${template.form_name} during ${visit.visit_type} visit`,
            task_type: visit.visit_type === 'review' ? 'review' : 'assessment',
            form_template_id: template.id,
            assigned_to_staff_id: visit.assigned_staff_id,
            subject_client_id: visit.client_id,
            priority: 'high',
            status: 'pending',
            scheduled_date: visit.scheduled_start?.split('T')[0],
            scheduled_time: visit.scheduled_start?.split('T')[1]?.substring(0, 5),
            due_date: visit.scheduled_start?.split('T')[0],
            linked_shift_id: visit.id
          };

          await base44.entities.StaffTask.create(taskData);
          console.log(`✅ Auto-created task for visit ${visit.id}: ${template.form_name}`);

        } catch (error) {
          console.error(`Failed to create task for visit ${visit.id}:`, error);
        }
      }
    };

    processVisits();
  }, [visits, existingTasks, formTemplates]);

  return null; // This is a background workflow component
}