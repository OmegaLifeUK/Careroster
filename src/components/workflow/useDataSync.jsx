import { useCallback } from "react";
import { DataSyncEngine } from "./DataSyncEngine";
import { useToast } from "@/components/ui/toast";

/**
 * React hook for automated data synchronization across the system
 */
export function useDataSync() {
  const { toast } = useToast();

  const syncCarePlanData = useCallback(async (carePlan) => {
    try {
      // Sync medications to eMar
      if (carePlan.medication_management?.medications?.length > 0) {
        const result = await DataSyncEngine.syncCarePlanMedications(carePlan);
        if (result.success) {
          toast.success('Data synced', 'Medications updated in eMar system');
        }
      }

      // Sync risks if present
      if (carePlan.risk_factors?.length > 0) {
        const riskResult = await DataSyncEngine.syncAssessmentRisks(
          { physical_health: carePlan.physical_health, mental_health: carePlan.mental_health, risk_factors: carePlan.risk_factors },
          carePlan.client_id
        );
        if (riskResult.success) {
          toast.success('Data synced', 'Risks updated in risk assessment section');
        }
      }

      return { success: true };
    } catch (error) {
      toast.error('Sync failed', error.message);
      return { success: false, error };
    }
  }, [toast]);

  const syncMedicationChange = useCallback(async (medicationData, sourceType, clientId) => {
    try {
      const result = await DataSyncEngine.syncMedicationBidirectional(medicationData, sourceType, clientId);
      
      if (result.success) {
        const target = sourceType === 'mar_sheet' ? 'care plan' : 'eMar';
        toast.success('Data synced', `Medications updated in ${target}`);
      }

      return result;
    } catch (error) {
      toast.error('Sync failed', error.message);
      return { success: false, error };
    }
  }, [toast]);

  const runAdmissionWorkflow = useCallback(async (clientId, careSetting) => {
    try {
      toast.info('Setting up client', 'Creating all required records...');
      
      const result = await DataSyncEngine.runClientAdmissionWorkflow(clientId, careSetting);
      
      if (result.success) {
        toast.success('Client setup complete', 'All records created and ready for use');
      }

      return result;
    } catch (error) {
      toast.error('Setup failed', error.message);
      return { success: false, error };
    }
  }, [toast]);

  const handleIncident = useCallback(async (incident) => {
    try {
      const result = await DataSyncEngine.runIncidentWorkflow(incident);
      
      if (result.success) {
        const messages = [];
        if (result.results.riskAssessment) messages.push('risk assessment');
        if (result.results.safeguarding) messages.push('safeguarding referral');
        if (result.results.carePlanUpdate) messages.push('care plan');
        
        toast.success('Incident processed', `Updated: ${messages.join(', ')}`);
      }

      return result;
    } catch (error) {
      toast.error('Processing failed', error.message);
      return { success: false, error };
    }
  }, [toast]);

  const processDailyNotes = useCallback(async (dailyNote) => {
    try {
      const result = await DataSyncEngine.runDailyNotesWorkflow(dailyNote);
      
      if (result.success) {
        // Silent sync - only show if concerns flagged
        if (result.concernFlagged) {
          toast.warning('Concern noted', 'Alert created for management review');
        }
      }

      return result;
    } catch (error) {
      console.error('Daily notes workflow error:', error);
      return { success: false, error };
    }
  }, [toast]);

  return {
    syncCarePlanData,
    syncMedicationChange,
    runAdmissionWorkflow,
    handleIncident,
    processDailyNotes
  };
}