import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import Carers from './pages/Carers';
import Clients from './pages/Clients';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Schedule": Schedule,
    "Reports": Reports,
    "Carers": Carers,
    "Clients": Clients,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};