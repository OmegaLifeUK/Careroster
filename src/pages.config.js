import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import Carers from './pages/Carers';
import Clients from './pages/Clients';
import Notifications from './pages/Notifications';
import StaffPortal from './pages/StaffPortal';
import LeaveRequests from './pages/LeaveRequests';
import DomCareDashboard from './pages/DomCareDashboard';
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};