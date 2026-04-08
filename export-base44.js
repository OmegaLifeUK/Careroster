import 'dotenv/config';
import axios from 'axios';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const APP_ID = process.env.VITE_BASE44_APP_ID;
const TOKEN = process.env.VITE_BASE44_ACCESS_TOKEN;
const BASE_URL = `https://base44.app/api/apps/${APP_ID}/entities`;

if (!APP_ID || !TOKEN) {
  console.error('Missing VITE_BASE44_APP_ID or VITE_BASE44_ACCESS_TOKEN in .env');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// All 112 entities found in the codebase
const ENTITIES = [
  'AccessibilitySettings', 'ActionPlan', 'AppSettings', 'Assessment', 'AuditLog',
  'AuditRecord', 'AuditTemplate', 'AutomatedWorkflow', 'BehaviorChart',
  'CRMDocument', 'CRMFollowUp', 'CallTranscript', 'CareAssessment', 'CarePlan',
  'CareTask', 'CareTaskCompletion', 'Carer', 'CarerAvailability', 'Case',
  'CaseDocument', 'CaseRiskAssessment', 'CaseSession', 'Client', 'ClientAlert',
  'ClientCommunication', 'ClientConsent', 'ClientDocument', 'ClientEnquiry',
  'ClientFeedback', 'ClientInvoice', 'ClientMessage', 'ClientPortalAccess',
  'ClientPortalMessage', 'ClientProgressRecord', 'CompetencyAssessment',
  'Complaint', 'ComplianceTask', 'Compliment', 'ConsentAndCapacity',
  'CourtDeadline', 'DBSAndReferences', 'DNACPR', 'DailyCareNote', 'DailyLog',
  'DayCentreActivity', 'DayCentreAttendance', 'DayCentreClient', 'DayCentreSession',
  'DoLS', 'DomCareClient', 'DomCareNotification', 'DomCareQualification',
  'FormSubmission', 'FormTemplate', 'GeneratedReport', 'HolidayAccrual',
  'Incident', 'IncidentReport', 'InductionRecord', 'LeaveRequest', 'MAREntry',
  'MARSheet', 'MedicalError', 'MedicationLog', 'MedicationTaskDetails',
  'MentalCapacityAssessment', 'MockInspection', 'Notification',
  'OnboardingWorkflow', 'OnboardingWorkflowConfig', 'OrganisationProfile',
  'PEEP', 'PayRate', 'PayrollPeriod', 'Payslip', 'PolicyLibrary',
  'PreEmploymentCompliance', 'PredictiveIncidentAlert', 'Qualification',
  'QualityAudit', 'Referral', 'RegulatoryNotification', 'RepositioningChart',
  'RiskAssessment', 'Run', 'SOSAlert', 'SafeguardingAlert', 'SafeguardingReferral',
  'ScheduledReport', 'SessionBookingRequest', 'Shift', 'ShiftRequest', 'Staff',
  'StaffMessage', 'StaffRole', 'StaffRoleAssignment', 'StaffSupervision',
  'StaffTask', 'SupportedLivingClient', 'SupportedLivingProperty',
  'SupportedLivingShift', 'TaskCompletion', 'TaskCompletionRecord', 'TaskRiskCheck',
  'TimeAttendance', 'TimeOffRequest', 'TimesheetEntry', 'TrainingAssignment',
  'TrainingModule', 'TrainingOffer', 'TrainingReminder', 'User', 'Visit',
];

const exportDir = './export';
if (!existsSync(exportDir)) {
  mkdirSync(exportDir, { recursive: true });
}

async function fetchAllRecords(entityName) {
  const allRecords = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    try {
      const url = offset > 0
        ? `/${entityName}?limit=${limit}&offset=${offset}`
        : `/${entityName}?limit=${limit}`;
      const response = await client.get(url);
      const data = Array.isArray(response.data) ? response.data : (response.data?.results || []);

      allRecords.push(...data);

      if (data.length < limit) break;
      offset += limit;
    } catch (err) {
      if (err.response?.status === 404) {
        return { records: [], status: 'not_found' };
      }
      if (err.response?.status === 401) {
        return { records: [], status: 'unauthorized' };
      }
      return { records: allRecords, status: `error_${err.response?.status || err.code}` };
    }
  }

  return { records: allRecords, status: 'ok' };
}

async function main() {
  console.log(`\nBase44 Data Export`);
  console.log(`App ID: ${APP_ID}`);
  console.log(`Entities to export: ${ENTITIES.length}`);
  console.log(`Output: ${exportDir}/\n`);

  const summary = { exported: [], empty: [], not_found: [], errors: [] };
  let totalRecords = 0;

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const entity of ENTITIES) {
    process.stdout.write(`  ${entity}... `);
    const { records, status } = await fetchAllRecords(entity);
    await delay(500); // avoid 429 rate limiting

    if (status === 'ok' && records.length > 0) {
      writeFileSync(`${exportDir}/${entity}.json`, JSON.stringify(records, null, 2));
      console.log(`${records.length} records ✓`);
      summary.exported.push({ name: entity, count: records.length });
      totalRecords += records.length;
    } else if (status === 'ok' && records.length === 0) {
      console.log(`0 records (empty)`);
      summary.empty.push(entity);
    } else if (status === 'not_found') {
      console.log(`not found (404)`);
      summary.not_found.push(entity);
    } else if (status === 'unauthorized') {
      console.log(`UNAUTHORIZED — token may be expired`);
      summary.errors.push({ name: entity, error: status });
      // If we get unauthorized, token is bad — stop early
      console.error('\n⚠ Token appears expired. Check VITE_BASE44_ACCESS_TOKEN in .env');
      break;
    } else {
      console.log(`ERROR: ${status}`);
      summary.errors.push({ name: entity, error: status });
    }
  }

  // Write summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`EXPORT SUMMARY`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total records exported: ${totalRecords}`);
  console.log(`Entities with data: ${summary.exported.length}`);
  console.log(`Empty entities: ${summary.empty.length}`);
  console.log(`Not found (404): ${summary.not_found.length}`);
  console.log(`Errors: ${summary.errors.length}`);

  if (summary.exported.length > 0) {
    console.log(`\nEntities with data:`);
    summary.exported
      .sort((a, b) => b.count - a.count)
      .forEach(e => console.log(`  ${e.name}: ${e.count} records`));
  }

  writeFileSync(`${exportDir}/_summary.json`, JSON.stringify(summary, null, 2));
  console.log(`\nFull summary saved to ${exportDir}/_summary.json`);
}

main();
