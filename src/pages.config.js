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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};