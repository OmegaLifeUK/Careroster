import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import Carers from './pages/Carers';
import Clients from './pages/Clients';
import Notifications from './pages/Notifications';
import StaffPortal from './pages/StaffPortal';
import LeaveRequests from './pages/LeaveRequests';
import DomCareDashboard from './pages/DomCareDashboard';
import DomCareSchedule from './pages/DomCareSchedule';
import DomCareStaff from './pages/DomCareStaff';
import DomCareClients from './pages/DomCareClients';
import DomCareRuns from './pages/DomCareRuns';
import DomCareReports from './pages/DomCareReports';
import CommunicationHub from './pages/CommunicationHub';
import StaffTraining from './pages/StaffTraining';
import ClientFeedback from './pages/ClientFeedback';
import ManagerDashboard from './pages/ManagerDashboard';
import IncidentManagement from './pages/IncidentManagement';
import SupportedLivingDashboard from './pages/SupportedLivingDashboard';
import DayCentreDashboard from './pages/DayCentreDashboard';
import SupportedLivingClients from './pages/SupportedLivingClients';
import SupportedLivingProperties from './pages/SupportedLivingProperties';
import SupportedLivingSchedule from './pages/SupportedLivingSchedule';
import DayCentreClients from './pages/DayCentreClients';
import DayCentreActivities from './pages/DayCentreActivities';
import DayCentreSessions from './pages/DayCentreSessions';
import DayCentreAttendance from './pages/DayCentreAttendance';
import ModuleSettings from './pages/ModuleSettings';
import ClientPortal from './pages/ClientPortal';
import ClientPortalSchedule from './pages/ClientPortalSchedule';
import ClientPortalMessages from './pages/ClientPortalMessages';
import ClientPortalBookings from './pages/ClientPortalBookings';
import UserManagement from './pages/UserManagement';
import AnalyticsPage from './pages/AnalyticsPage';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Schedule": Schedule,
    "Reports": Reports,
    "Carers": Carers,
    "Clients": Clients,
    "Notifications": Notifications,
    "StaffPortal": StaffPortal,
    "LeaveRequests": LeaveRequests,
    "DomCareDashboard": DomCareDashboard,
    "DomCareSchedule": DomCareSchedule,
    "DomCareStaff": DomCareStaff,
    "DomCareClients": DomCareClients,
    "DomCareRuns": DomCareRuns,
    "DomCareReports": DomCareReports,
    "CommunicationHub": CommunicationHub,
    "StaffTraining": StaffTraining,
    "ClientFeedback": ClientFeedback,
    "ManagerDashboard": ManagerDashboard,
    "IncidentManagement": IncidentManagement,
    "SupportedLivingDashboard": SupportedLivingDashboard,
    "DayCentreDashboard": DayCentreDashboard,
    "SupportedLivingClients": SupportedLivingClients,
    "SupportedLivingProperties": SupportedLivingProperties,
    "SupportedLivingSchedule": SupportedLivingSchedule,
    "DayCentreClients": DayCentreClients,
    "DayCentreActivities": DayCentreActivities,
    "DayCentreSessions": DayCentreSessions,
    "DayCentreAttendance": DayCentreAttendance,
    "ModuleSettings": ModuleSettings,
    "ClientPortal": ClientPortal,
    "ClientPortalSchedule": ClientPortalSchedule,
    "ClientPortalMessages": ClientPortalMessages,
    "ClientPortalBookings": ClientPortalBookings,
    "UserManagement": UserManagement,
    "AnalyticsPage": AnalyticsPage,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};