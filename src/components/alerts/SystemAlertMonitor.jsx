import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isToday, isPast, parseISO, format } from "date-fns";

export default function SystemAlertMonitor({ 
  shifts = [], 
  medications = [], 
  clients = [], 
  carers = [] 
}) {
  const queryClient = useQueryClient();

  const createAlertMutation = useMutation({
    mutationFn: async (alertData) => {
      // Check if alert already exists to avoid duplicates
      const existingAlerts = await base44.entities.ClientAlert.filter({
        client_id: alertData.client_id,
        alert_type: alertData.alert_type,
        status: 'active'
      });
      
      const alreadyExists = Array.isArray(existingAlerts) && existingAlerts.some(a => 
        a && a.title === alertData.title && 
        isToday(parseISO(a.created_date))
      );

      if (!alreadyExists) {
        return await base44.entities.ClientAlert.create(alertData);
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-alerts'] });
    },
  });

  useEffect(() => {
    const checkAndGenerateAlerts = async () => {
      const now = new Date();
      
      // Check for missed/late shifts
      if (Array.isArray(shifts)) {
        const missedShifts = shifts.filter(shift => {
          if (!shift || !shift.date || !shift.start_time) return false;
          try {
            const shiftDate = parseISO(shift.date);
            if (!isToday(shiftDate)) return false;
            
            const [hours, minutes] = shift.start_time.split(':');
            const shiftTime = new Date();
            shiftTime.setHours(parseInt(hours), parseInt(minutes), 0);
            
            return now > shiftTime && 
                   shift.status !== 'completed' && 
                   shift.status !== 'in_progress' &&
                   shift.status !== 'cancelled';
          } catch {
            return false;
          }
        });

        for (const shift of missedShifts) {
          if (!shift) continue;
          
          const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;
          const carer = Array.isArray(carers) ? carers.find(c => c && c.id === shift.carer_id) : null;
          
          if (client) {
            await createAlertMutation.mutateAsync({
              client_id: client.id,
              alert_type: 'other',
              severity: 'high',
              title: `Missed Shift - ${shift.start_time}`,
              description: `Shift scheduled for ${shift.start_time} has not been started. ${
                carer ? `Assigned to: ${carer.full_name}` : 'No carer assigned'
              }`,
              created_by_staff_id: 'system',
              display_on_sections: ['dashboard', 'schedule', 'all'],
              requires_acknowledgment: true,
              action_required: 'Contact carer immediately and verify shift status'
            });
          }
        }
      }

      // Check for missed medications
      if (Array.isArray(medications)) {
        const missedMeds = medications.filter(med => {
          if (!med || !med.administration_time) return false;
          try {
            const medTime = parseISO(med.administration_time);
            return isPast(medTime) && 
                   med.status !== 'administered' && 
                   med.status !== 'not_required' &&
                   isToday(medTime);
          } catch {
            return false;
          }
        });

        for (const med of missedMeds) {
          if (!med) continue;
          
          const client = Array.isArray(clients) ? clients.find(c => c && c.id === med.client_id) : null;
          
          if (client) {
            await createAlertMutation.mutateAsync({
              client_id: client.id,
              alert_type: 'medication',
              severity: 'critical',
              title: `Missed Medication - ${med.medication_name}`,
              description: `${med.medication_name} (${med.dosage}) was due at ${format(parseISO(med.administration_time), 'HH:mm')} and has not been administered.`,
              created_by_staff_id: 'system',
              display_on_sections: ['dashboard', 'medication', 'all'],
              requires_acknowledgment: true,
              action_required: 'Administer medication immediately if still within safe window, otherwise contact prescriber'
            });
          }
        }
      }

      // Check for unfilled shifts approaching soon
      if (Array.isArray(shifts)) {
        const upcomingUnfilled = shifts.filter(shift => {
          if (!shift || !shift.date || !shift.start_time) return false;
          try {
            const shiftDate = parseISO(shift.date);
            const [hours, minutes] = shift.start_time.split(':');
            const shiftDateTime = new Date(shiftDate);
            shiftDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
            
            const hoursUntilShift = (shiftDateTime - now) / (1000 * 60 * 60);
            
            return hoursUntilShift > 0 && 
                   hoursUntilShift < 24 && 
                   !shift.carer_id &&
                   shift.status === 'unfilled';
          } catch {
            return false;
          }
        });

        for (const shift of upcomingUnfilled) {
          if (!shift) continue;
          
          const client = Array.isArray(clients) ? clients.find(c => c && c.id === shift.client_id) : null;
          
          if (client) {
            await createAlertMutation.mutateAsync({
              client_id: client.id,
              alert_type: 'other',
              severity: 'high',
              title: `Unfilled Shift in Next 24 Hours`,
              description: `Shift on ${shift.date} at ${shift.start_time} has no assigned carer. Client: ${client.full_name}`,
              created_by_staff_id: 'system',
              display_on_sections: ['dashboard', 'schedule', 'all'],
              requires_acknowledgment: false,
              action_required: 'Assign a qualified carer to this shift urgently'
            });
          }
        }
      }
    };

    // Run check every 5 minutes
    checkAndGenerateAlerts();
    const interval = setInterval(checkAndGenerateAlerts, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [shifts, medications, clients, carers]);

  return null; // This is a monitoring component, no UI
}