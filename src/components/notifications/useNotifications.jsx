import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook for creating and managing notifications
 * Handles in-app notifications and optional email alerts
 */
export function useNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createNotificationMutation = useMutation({
    mutationFn: (notificationData) => base44.entities.DomCareNotification.create(notificationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ to, subject, body }) => 
      base44.integrations.Core.SendEmail({ to, subject, body }),
  });

  const notifyVisitAssignment = async ({ visit, staff, client, sendEmail = false }) => {
    const message = `You have been assigned to visit ${client.full_name} on ${new Date(visit.scheduled_start).toLocaleString()}`;
    
    // Create in-app notification
    await createNotificationMutation.mutateAsync({
      recipient_email: staff.email,
      notification_type: 'visit_assigned',
      title: 'New Visit Assignment',
      message,
      related_entity_type: 'Visit',
      related_entity_id: visit.id,
      priority: 'normal',
      is_read: false,
    });

    // Show toast
    toast.success('Staff member notified of assignment');

    // Send email if enabled
    if (sendEmail && staff.email) {
      await sendEmailMutation.mutateAsync({
        to: staff.email,
        subject: 'New Visit Assignment',
        body: `
          <h2>New Visit Assignment</h2>
          <p>You have been assigned to a new visit:</p>
          <ul>
            <li><strong>Client:</strong> ${client.full_name}</li>
            <li><strong>Date/Time:</strong> ${new Date(visit.scheduled_start).toLocaleString()}</li>
            <li><strong>Duration:</strong> ${visit.duration_minutes || 60} minutes</li>
            <li><strong>Address:</strong> ${client.address?.street || ''}, ${client.address?.postcode || ''}</li>
          </ul>
          ${visit.visit_notes ? `<p><strong>Notes:</strong> ${visit.visit_notes}</p>` : ''}
          <p>Please log in to the system for full details.</p>
        `,
      });
    }
  };

  const notifyVisitCancellation = async ({ visit, staff, client, reason = '', sendEmail = false }) => {
    const message = `Visit with ${client.full_name} on ${new Date(visit.scheduled_start).toLocaleString()} has been cancelled${reason ? `: ${reason}` : ''}`;
    
    await createNotificationMutation.mutateAsync({
      recipient_email: staff.email,
      notification_type: 'visit_cancelled',
      title: 'Visit Cancelled',
      message,
      related_entity_type: 'Visit',
      related_entity_id: visit.id,
      priority: 'high',
      is_read: false,
    });

    toast.warning('Staff member notified of cancellation');

    if (sendEmail && staff.email) {
      await sendEmailMutation.mutateAsync({
        to: staff.email,
        subject: 'Visit Cancelled',
        body: `
          <h2>Visit Cancellation</h2>
          <p>The following visit has been cancelled:</p>
          <ul>
            <li><strong>Client:</strong> ${client.full_name}</li>
            <li><strong>Date/Time:</strong> ${new Date(visit.scheduled_start).toLocaleString()}</li>
          </ul>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please check your schedule for any updates.</p>
        `,
      });
    }
  };

  const notifyVisitRescheduled = async ({ visit, staff, client, oldTime, newTime, sendEmail = false }) => {
    const message = `Visit with ${client.full_name} has been rescheduled from ${new Date(oldTime).toLocaleString()} to ${new Date(newTime).toLocaleString()}`;
    
    await createNotificationMutation.mutateAsync({
      recipient_email: staff.email,
      notification_type: 'visit_rescheduled',
      title: 'Visit Rescheduled',
      message,
      related_entity_type: 'Visit',
      related_entity_id: visit.id,
      priority: 'high',
      is_read: false,
    });

    toast.info('Staff member notified of reschedule');

    if (sendEmail && staff.email) {
      await sendEmailMutation.mutateAsync({
        to: staff.email,
        subject: 'Visit Rescheduled',
        body: `
          <h2>Visit Rescheduled</h2>
          <p>Your visit has been rescheduled:</p>
          <ul>
            <li><strong>Client:</strong> ${client.full_name}</li>
            <li><strong>Previous Time:</strong> ${new Date(oldTime).toLocaleString()}</li>
            <li><strong>New Time:</strong> ${new Date(newTime).toLocaleString()}</li>
          </ul>
          <p>Please update your schedule accordingly.</p>
        `,
      });
    }
  };

  const notifyUrgentUpdate = async ({ recipientEmail, title, message, relatedEntityType, relatedEntityId, sendEmail = false }) => {
    await createNotificationMutation.mutateAsync({
      recipient_email: recipientEmail,
      notification_type: 'urgent',
      title,
      message,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      priority: 'urgent',
      is_read: false,
    });

    toast.error(title);

    if (sendEmail && recipientEmail) {
      await sendEmailMutation.mutateAsync({
        to: recipientEmail,
        subject: `URGENT: ${title}`,
        body: `
          <h2 style="color: #dc2626;">URGENT NOTIFICATION</h2>
          <p>${message}</p>
          <p>Please take immediate action and check the system for full details.</p>
        `,
      });
    }
  };

  const notifyVisitReminder = async ({ visit, staff, client, sendEmail = false }) => {
    const message = `Reminder: You have a visit with ${client.full_name} in 1 hour at ${new Date(visit.scheduled_start).toLocaleTimeString()}`;
    
    await createNotificationMutation.mutateAsync({
      recipient_email: staff.email,
      notification_type: 'reminder',
      title: 'Visit Reminder',
      message,
      related_entity_type: 'Visit',
      related_entity_id: visit.id,
      priority: 'normal',
      is_read: false,
    });

    if (sendEmail && staff.email) {
      await sendEmailMutation.mutateAsync({
        to: staff.email,
        subject: 'Visit Reminder - 1 Hour',
        body: `
          <h2>Visit Reminder</h2>
          <p>This is a reminder of your upcoming visit:</p>
          <ul>
            <li><strong>Client:</strong> ${client.full_name}</li>
            <li><strong>Time:</strong> ${new Date(visit.scheduled_start).toLocaleString()}</li>
            <li><strong>Address:</strong> ${client.address?.street || ''}, ${client.address?.postcode || ''}</li>
          </ul>
          <p>Please ensure you arrive on time.</p>
        `,
      });
    }
  };

  return {
    notifyVisitAssignment,
    notifyVisitCancellation,
    notifyVisitRescheduled,
    notifyUrgentUpdate,
    notifyVisitReminder,
  };
}