import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Schedule": Schedule,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};