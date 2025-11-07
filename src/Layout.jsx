
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  UserCircle, 
  Bell, 
  ClipboardList,
  Smartphone,
  LogOut,
  FileText,
  Menu,
  MapPin,
  Navigation,
  MessageSquare,
  GraduationCap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const residentialCareNav = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Manager Dashboard",
    url: createPageUrl("ManagerDashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Schedule",
    url: createPageUrl("Schedule"),
    icon: Calendar,
  },
  {
    title: "Carers",
    url: createPageUrl("Carers"),
    icon: Users,
  },
  {
    title: "Clients",
    url: createPageUrl("Clients"),
    icon: UserCircle,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: FileText,
  },
  {
    title: "Notifications",
    url: createPageUrl("Notifications"),
    icon: Bell,
  },
  {
    title: "Leave Requests",
    url: createPageUrl("LeaveRequests"),
    icon: ClipboardList,
  },
];

const domCareNav = [
  {
    title: "Dom Care Dashboard",
    url: createPageUrl("DomCareDashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Visit Schedule",
    url: createPageUrl("DomCareSchedule"),
    icon: MapPin,
  },
  {
    title: "Staff",
    url: createPageUrl("DomCareStaff"),
    icon: Users,
  },
  {
    title: "Clients",
    url: createPageUrl("DomCareClients"),
    icon: UserCircle,
  },
  {
    title: "Runs",
    url: createPageUrl("DomCareRuns"),
    icon: Navigation,
  },
  {
    title: "Communications",
    url: createPageUrl("CommunicationHub"),
    icon: MessageSquare,
  },
  {
    title: "Client Feedback",
    url: createPageUrl("ClientFeedback"),
    icon: MessageSquare,
  },
  {
    title: "Training",
    url: createPageUrl("StaffTraining"),
    icon: GraduationCap,
  },
  {
    title: "Reports",
    url: createPageUrl("DomCareReports"),
    icon: FileText,
  },
];

const staffNavigation = [
  {
    title: "Staff Portal",
    url: createPageUrl("StaffPortal"),
    icon: Smartphone,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      if (!user) return 0;
      const notifications = await base44.entities.Notification.filter({ is_read: false });
      return notifications.length;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      <style>{`
        :root {
          --primary: 203 89% 53%;
          --primary-foreground: 0 0% 100%;
          --secondary: 156 73% 44%;
          --secondary-foreground: 0 0% 100%;
          --accent: 203 89% 96%;
          --muted: 210 40% 96%;
          --background: 0 0% 98%;
        }
      `}</style>
      
      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900">CareRoster</h2>
                  <p className="text-xs text-gray-500">Care Management</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-3">
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                  Residential Care
                </p>
                <nav className="space-y-1">
                  {residentialCareNav.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        location.pathname === item.url 
                          ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                      {item.title === "Notifications" && unreadCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white">{unreadCount}</Badge>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                  Domiciliary Care
                </p>
                <nav className="space-y-1">
                  {domCareNav.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        location.pathname === item.url 
                          ? 'bg-green-50 text-green-700 font-medium shadow-sm' 
                          : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                  Staff Access
                </p>
                <nav className="space-y-1">
                  {staffNavigation.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        location.pathname === item.url 
                          ? 'bg-purple-50 text-purple-700 font-medium shadow-sm' 
                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.role || 'Staff'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 lg:hidden sticky top-0 z-30 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">CareRoster</h1>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
