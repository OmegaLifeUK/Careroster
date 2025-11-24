import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";

export const useClientOnboarding = () => {
  const { toast } = useToast();

  const initiateOnboarding = async (client, assignedStaffId) => {
    try {
      // Step 1: Create onboarding workflow
      const steps = [
        { step_name: "Send Welcome Email", step_type: "email", status: "pending" },
        { step_name: "Create Onboarding Task", step_type: "task", status: "pending" },
        { step_name: "Initial Assessment", step_type: "assessment", status: "pending" },
        { step_name: "Create Care Plan", step_type: "document", status: "pending" },
        { step_name: "Upload Required Documents", step_type: "document", status: "pending" },
        { step_name: "Schedule First Visit", step_type: "system", status: "pending" }
      ];

      const workflow = await base44.entities.OnboardingWorkflow.create({
        client_id: client.id,
        assigned_staff_id: assignedStaffId,
        workflow_status: "in_progress",
        steps: steps,
        start_date: new Date().toISOString(),
        expected_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress_percentage: 0
      });

      // Step 2: Send welcome email
      try {
        await base44.integrations.Core.SendEmail({
          to: client.email || client.emergency_contact?.email,
          subject: "Welcome to Our Care Service",
          body: `Dear ${client.full_name},

Welcome to our care service! We're delighted to have you join our community.

Our team is here to provide you with exceptional care and support. Your assigned care coordinator will be in touch within 24 hours to discuss your care plan and answer any questions you may have.

What happens next:
1. Initial Assessment - We'll schedule a comprehensive assessment to understand your needs
2. Care Plan Development - We'll create a personalized care plan tailored to you
3. Meet Your Care Team - You'll be introduced to the staff who will be providing your care
4. First Visit - We'll schedule your first care visit at a time that suits you

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
Care Team`
        });

        // Update workflow
        steps[0].status = "completed";
        steps[0].completed_date = new Date().toISOString();
        
        await base44.entities.OnboardingWorkflow.update(workflow.id, {
          welcome_email_sent: true,
          welcome_email_sent_date: new Date().toISOString(),
          steps: steps,
          progress_percentage: calculateProgress(steps)
        });

        toast.success("Welcome email sent", `Email sent to ${client.full_name}`);
      } catch (emailError) {
        console.error("Email error:", emailError);
        steps[0].status = "failed";
        steps[0].notes = "Failed to send email";
        await base44.entities.OnboardingWorkflow.update(workflow.id, { steps: steps });
      }

      // Step 3: Create onboarding task
      try {
        const task = await base44.entities.CareTask.create({
          client_id: client.id,
          assigned_to: assignedStaffId,
          title: `Complete Onboarding for ${client.full_name}`,
          description: `New client onboarding tasks:
- Conduct initial assessment
- Review medical history and care needs
- Create personalized care plan
- Upload required documents (ID, medical records, consent forms)
- Schedule first care visit
- Introduce client to care team`,
          priority: "high",
          status: "pending",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          task_type: "onboarding"
        });

        steps[1].status = "completed";
        steps[1].completed_date = new Date().toISOString();

        await base44.entities.OnboardingWorkflow.update(workflow.id, {
          onboarding_task_created: true,
          onboarding_task_id: task.id,
          steps: steps,
          progress_percentage: calculateProgress(steps)
        });

        toast.success("Onboarding task created", `Assigned to staff member`);
      } catch (taskError) {
        console.error("Task error:", taskError);
        steps[1].status = "failed";
        steps[1].notes = "Failed to create task";
        await base44.entities.OnboardingWorkflow.update(workflow.id, { steps: steps });
      }

      // Step 4: Create initial client alert
      try {
        await base44.entities.ClientAlert.create({
          client_id: client.id,
          alert_type: "onboarding",
          severity: "info",
          title: "New Client Onboarding in Progress",
          description: `${client.full_name} has been added to the system. Complete onboarding within 7 days.`,
          status: "active",
          assigned_to: assignedStaffId
        });
      } catch (alertError) {
        console.error("Alert error:", alertError);
      }

      toast.success("Onboarding initiated", `Workflow started for ${client.full_name}`);
      
      return workflow;
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Onboarding failed", error.message);
      throw error;
    }
  };

  const updateOnboardingStep = async (workflowId, stepIndex, status, notes) => {
    try {
      const workflow = await base44.entities.OnboardingWorkflow.filter({ id: workflowId });
      if (!workflow || workflow.length === 0) return;

      const currentWorkflow = workflow[0];
      const steps = currentWorkflow.steps;
      
      steps[stepIndex].status = status;
      steps[stepIndex].completed_date = new Date().toISOString();
      steps[stepIndex].notes = notes;

      const progress = calculateProgress(steps);
      const allCompleted = steps.every(s => s.status === "completed" || s.status === "skipped");

      await base44.entities.OnboardingWorkflow.update(workflowId, {
        steps: steps,
        progress_percentage: progress,
        workflow_status: allCompleted ? "completed" : "in_progress",
        completion_date: allCompleted ? new Date().toISOString() : undefined
      });

      toast.success("Step updated", `Onboarding step ${status}`);
    } catch (error) {
      console.error("Update step error:", error);
      toast.error("Update failed", error.message);
    }
  };

  const calculateProgress = (steps) => {
    const completed = steps.filter(s => s.status === "completed" || s.status === "skipped").length;
    return Math.round((completed / steps.length) * 100);
  };

  return { initiateOnboarding, updateOnboardingStep };
};