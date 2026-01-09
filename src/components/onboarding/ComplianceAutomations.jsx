import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, isPast } from "date-fns";

export default function ComplianceAutomations() {
  const { data: allDBS = [] } = useQuery({
    queryKey: ['dbs-monitoring'],
    queryFn: async () => {
      const records = await base44.entities.DBSAndReferences.list();
      return Array.isArray(records) ? records : [];
    },
    refetchInterval: 60000 * 60 // Check every hour
  });

  const { data: allTraining = [] } = useQuery({
    queryKey: ['training-monitoring'],
    queryFn: async () => {
      const records = await base44.entities.TrainingAssignment.list();
      return Array.isArray(records) ? records : [];
    },
    refetchInterval: 60000 * 60
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['careplan-monitoring'],
    queryFn: async () => {
      const plans = await base44.entities.CarePlan.list();
      return Array.isArray(plans) ? plans : [];
    },
    refetchInterval: 60000 * 60
  });

  const { data: orgProfile } = useQuery({
    queryKey: ['org-profile-alerts'],
    queryFn: async () => {
      const profiles = await base44.entities.OrganisationProfile.list();
      return profiles[0] || null;
    }
  });

  useEffect(() => {
    const runAutomations = async () => {
      const user = await base44.auth.me();
      const managerEmail = orgProfile?.registered_manager_email;
      
      // DBS Expiry Alerts
      for (const dbs of allDBS) {
        if (!dbs.dbs_review_date) continue;
        
        const daysUntil = differenceInDays(new Date(dbs.dbs_review_date), new Date());
        
        if (daysUntil === 30 || daysUntil === 14 || daysUntil === 7) {
          // Check if alert already exists for this DBS
          const existingAlerts = await base44.entities.Notification.filter({
            related_entity_id: dbs.id,
            is_read: false
          });
          
          if (!existingAlerts || existingAlerts.length === 0) {
            // Create notification
            await base44.entities.Notification.create({
              title: `DBS Expiring in ${daysUntil} days`,
              message: `DBS check for staff member expires on ${dbs.dbs_review_date}. Please arrange renewal immediately.`,
              type: 'compliance_alert',
              priority: daysUntil <= 7 ? 'urgent' : 'high',
              recipient_email: managerEmail || user.email,
              related_entity_type: 'DBSAndReferences',
              related_entity_id: dbs.id,
              is_read: false
            });
          }
        }

        if (daysUntil < 0) {
          // DBS expired - create urgent alert
          const existingAlerts = await base44.entities.Notification.filter({
            related_entity_id: `${dbs.id}_expired`,
            is_read: false
          });
          
          if (!existingAlerts || existingAlerts.length === 0) {
            await base44.entities.Notification.create({
              title: `⚠️ DBS EXPIRED`,
              message: `DBS check expired on ${dbs.dbs_review_date}. Staff member must not work until renewed.`,
              type: 'compliance_alert',
              priority: 'urgent',
              recipient_email: managerEmail || user.email,
              related_entity_type: 'DBSAndReferences',
              related_entity_id: `${dbs.id}_expired`,
              is_read: false
            });
          }
        }
      }

      // Training Expiry Alerts
      for (const training of allTraining) {
        if (!training.expiry_date) continue;
        
        const daysUntil = differenceInDays(new Date(training.expiry_date), new Date());
        
        if (daysUntil === 30 || daysUntil === 14) {
          const existingAlerts = await base44.entities.Notification.filter({
            related_entity_id: training.id,
            is_read: false
          });
          
          if (!existingAlerts || existingAlerts.length === 0) {
            await base44.entities.Notification.create({
              title: `Training Expiring: ${training.training_name}`,
              message: `Training expires in ${daysUntil} days. Renewal required.`,
              type: 'training_reminder',
              priority: daysUntil <= 14 ? 'high' : 'medium',
              recipient_email: managerEmail || user.email,
              related_entity_type: 'TrainingAssignment',
              related_entity_id: training.id,
              is_read: false
            });
          }
        }
      }

      // Care Plan Review Alerts
      for (const plan of carePlans) {
        if (!plan.review_date || plan.status !== 'active') continue;
        
        if (isPast(new Date(plan.review_date))) {
          const existingAlerts = await base44.entities.Notification.filter({
            related_entity_id: `${plan.id}_overdue`,
            is_read: false
          });
          
          if (!existingAlerts || existingAlerts.length === 0) {
            await base44.entities.Notification.create({
              title: `Care Plan Review Overdue`,
              message: `Care plan review was due on ${plan.review_date}. Please complete review immediately.`,
              type: 'care_plan_review',
              priority: 'high',
              recipient_email: managerEmail || user.email,
              related_entity_type: 'CarePlan',
              related_entity_id: `${plan.id}_overdue`,
              is_read: false
            });
          }
        }
      }
    };

    runAutomations().catch(console.error);
  }, [allDBS, allTraining, carePlans, orgProfile]);

  return null; // Silent background component
}