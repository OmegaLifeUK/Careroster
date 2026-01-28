/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActionPlanProgress from './pages/ActionPlanProgress';
import ActionPlans from './pages/ActionPlans';
import AddAssessment from './pages/AddAssessment';
import AddCareTask from './pages/AddCareTask';
import AddMARSheet from './pages/AddMARSheet';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditTemplates from './pages/AuditTemplates';
import Audits from './pages/Audits';
import CRMDashboard from './pages/CRMDashboard';
import CallTranscripts from './pages/CallTranscripts';
import CareDocuments from './pages/CareDocuments';
import CarerAvailability from './pages/CarerAvailability';
import CarerDetail from './pages/CarerDetail';
import CarerPerformanceDashboard from './pages/CarerPerformanceDashboard';
import Carers from './pages/Carers';
import ClientCommunicationHub from './pages/ClientCommunicationHub';
import ClientFeedback from './pages/ClientFeedback';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientPortal from './pages/ClientPortal';
import ClientPortalBookings from './pages/ClientPortalBookings';
import ClientPortalMessages from './pages/ClientPortalMessages';
import ClientPortalSchedule from './pages/ClientPortalSchedule';
import Clients from './pages/Clients';
import CommunicationHub from './pages/CommunicationHub';
import ComplaintsManagement from './pages/ComplaintsManagement';
import ComplianceDashboard from './pages/ComplianceDashboard';
import ComplianceHub from './pages/ComplianceHub';
import ComplianceReports from './pages/ComplianceReports';
import ComplianceTaskCenter from './pages/ComplianceTaskCenter';
import CustomReportsPage from './pages/CustomReportsPage';
import DailyLog from './pages/DailyLog';
import Dashboard from './pages/Dashboard';
import DayCentreActivities from './pages/DayCentreActivities';
import DayCentreAttendance from './pages/DayCentreAttendance';
import DayCentreClientProfile from './pages/DayCentreClientProfile';
import DayCentreClients from './pages/DayCentreClients';
import DayCentreDashboard from './pages/DayCentreDashboard';
import DayCentreSessions from './pages/DayCentreSessions';
import DomCareClientProfile from './pages/DomCareClientProfile';
import DomCareClients from './pages/DomCareClients';
import DomCareDashboard from './pages/DomCareDashboard';
import DomCareReports from './pages/DomCareReports';
import DomCareRuns from './pages/DomCareRuns';
import DomCareSchedule from './pages/DomCareSchedule';
import DomCareStaff from './pages/DomCareStaff';
import EnquiryDetail from './pages/EnquiryDetail';
import FollowUpTracker from './pages/FollowUpTracker';
import FormBuilder from './pages/FormBuilder';
import Home from './pages/Home';
import IncidentManagement from './pages/IncidentManagement';
import InvoiceManagement from './pages/InvoiceManagement';
import LeaveRequests from './pages/LeaveRequests';
import ManagerDashboard from './pages/ManagerDashboard';
import MedicalErrors from './pages/MedicalErrors';
import MessagingCenter from './pages/MessagingCenter';
import MockInspections from './pages/MockInspections';
import ModuleSettings from './pages/ModuleSettings';
import Notifications from './pages/Notifications';
import OnboardingConfiguration from './pages/OnboardingConfiguration';
import OnboardingHub from './pages/OnboardingHub';
import OrganisationSetup from './pages/OrganisationSetup';
import PayrollDashboard from './pages/PayrollDashboard';
import PayrollProcessing from './pages/PayrollProcessing';
import PermissionsPage from './pages/PermissionsPage';
import PolicyLibrary from './pages/PolicyLibrary';
import RegulatoryNotifications from './pages/RegulatoryNotifications';
import ReportingEngine from './pages/ReportingEngine';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import Schedule from './pages/Schedule';
import StaffAvailabilityCalendar from './pages/StaffAvailabilityCalendar';
import StaffOnboarding from './pages/StaffOnboarding';
import StaffPortal from './pages/StaffPortal';
import StaffRoleAssignments from './pages/StaffRoleAssignments';
import StaffTasks from './pages/StaffTasks';
import StaffTraining from './pages/StaffTraining';
import SupervisionManagement from './pages/SupervisionManagement';
import SupportedLivingClientProfile from './pages/SupportedLivingClientProfile';
import SupportedLivingClients from './pages/SupportedLivingClients';
import SupportedLivingDashboard from './pages/SupportedLivingDashboard';
import SupportedLivingProperties from './pages/SupportedLivingProperties';
import SupportedLivingSchedule from './pages/SupportedLivingSchedule';
import TechnicalSpecification from './pages/TechnicalSpecification';
import TimesheetReconciliation from './pages/TimesheetReconciliation';
import TrainingMatrix from './pages/TrainingMatrix';
import UserManagement from './pages/UserManagement';
import WorkflowsPage from './pages/WorkflowsPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActionPlanProgress": ActionPlanProgress,
    "ActionPlans": ActionPlans,
    "AddAssessment": AddAssessment,
    "AddCareTask": AddCareTask,
    "AddMARSheet": AddMARSheet,
    "AnalyticsPage": AnalyticsPage,
    "AuditTemplates": AuditTemplates,
    "Audits": Audits,
    "CRMDashboard": CRMDashboard,
    "CallTranscripts": CallTranscripts,
    "CareDocuments": CareDocuments,
    "CarerAvailability": CarerAvailability,
    "CarerDetail": CarerDetail,
    "CarerPerformanceDashboard": CarerPerformanceDashboard,
    "Carers": Carers,
    "ClientCommunicationHub": ClientCommunicationHub,
    "ClientFeedback": ClientFeedback,
    "ClientOnboarding": ClientOnboarding,
    "ClientPortal": ClientPortal,
    "ClientPortalBookings": ClientPortalBookings,
    "ClientPortalMessages": ClientPortalMessages,
    "ClientPortalSchedule": ClientPortalSchedule,
    "Clients": Clients,
    "CommunicationHub": CommunicationHub,
    "ComplaintsManagement": ComplaintsManagement,
    "ComplianceDashboard": ComplianceDashboard,
    "ComplianceHub": ComplianceHub,
    "ComplianceReports": ComplianceReports,
    "ComplianceTaskCenter": ComplianceTaskCenter,
    "CustomReportsPage": CustomReportsPage,
    "DailyLog": DailyLog,
    "Dashboard": Dashboard,
    "DayCentreActivities": DayCentreActivities,
    "DayCentreAttendance": DayCentreAttendance,
    "DayCentreClientProfile": DayCentreClientProfile,
    "DayCentreClients": DayCentreClients,
    "DayCentreDashboard": DayCentreDashboard,
    "DayCentreSessions": DayCentreSessions,
    "DomCareClientProfile": DomCareClientProfile,
    "DomCareClients": DomCareClients,
    "DomCareDashboard": DomCareDashboard,
    "DomCareReports": DomCareReports,
    "DomCareRuns": DomCareRuns,
    "DomCareSchedule": DomCareSchedule,
    "DomCareStaff": DomCareStaff,
    "EnquiryDetail": EnquiryDetail,
    "FollowUpTracker": FollowUpTracker,
    "FormBuilder": FormBuilder,
    "Home": Home,
    "IncidentManagement": IncidentManagement,
    "InvoiceManagement": InvoiceManagement,
    "LeaveRequests": LeaveRequests,
    "ManagerDashboard": ManagerDashboard,
    "MedicalErrors": MedicalErrors,
    "MessagingCenter": MessagingCenter,
    "MockInspections": MockInspections,
    "ModuleSettings": ModuleSettings,
    "Notifications": Notifications,
    "OnboardingConfiguration": OnboardingConfiguration,
    "OnboardingHub": OnboardingHub,
    "OrganisationSetup": OrganisationSetup,
    "PayrollDashboard": PayrollDashboard,
    "PayrollProcessing": PayrollProcessing,
    "PermissionsPage": PermissionsPage,
    "PolicyLibrary": PolicyLibrary,
    "RegulatoryNotifications": RegulatoryNotifications,
    "ReportingEngine": ReportingEngine,
    "Reports": Reports,
    "RoleManagement": RoleManagement,
    "Schedule": Schedule,
    "StaffAvailabilityCalendar": StaffAvailabilityCalendar,
    "StaffOnboarding": StaffOnboarding,
    "StaffPortal": StaffPortal,
    "StaffRoleAssignments": StaffRoleAssignments,
    "StaffTasks": StaffTasks,
    "StaffTraining": StaffTraining,
    "SupervisionManagement": SupervisionManagement,
    "SupportedLivingClientProfile": SupportedLivingClientProfile,
    "SupportedLivingClients": SupportedLivingClients,
    "SupportedLivingDashboard": SupportedLivingDashboard,
    "SupportedLivingProperties": SupportedLivingProperties,
    "SupportedLivingSchedule": SupportedLivingSchedule,
    "TechnicalSpecification": TechnicalSpecification,
    "TimesheetReconciliation": TimesheetReconciliation,
    "TrainingMatrix": TrainingMatrix,
    "UserManagement": UserManagement,
    "WorkflowsPage": WorkflowsPage,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};