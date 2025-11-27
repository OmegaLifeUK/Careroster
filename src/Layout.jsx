import React, { useState } from "react";
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
  GraduationCap,
  Shield,
  Home,
  Activity,
  Settings,
  X,
  Search,
  FolderOpen,
  Eye,
  Phone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import KeyboardShortcuts from "@/components/ui/keyboard-shortcuts";
import GlobalSearch from "@/components/ui/global-search";
import { ToastProvider } from "@/components/ui/toast";
import AccessibilityPanel from "@/components/accessibility/AccessibilityPanel";

const residentialCareNav = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Manager Dashboard", url: createPageUrl("ManagerDashboard"), icon: LayoutDashboard },
  { title: "Schedule", url: createPageUrl("Schedule"), icon: Calendar },
  { title: "Carer Availability", url: createPageUrl("CarerAvailability"), icon: Calendar },
  { title: "Messaging Center", url: createPageUrl("MessagingCenter"), icon: MessageSquare },
  { title: "Staff Tasks", url: createPageUrl("StaffTasks"), icon: ClipboardList },
  { title: "Carers", url: createPageUrl("Carers"), icon: Users },
  { title: "Clients", url: createPageUrl("Clients"), icon: UserCircle },
  { title: "Care Documents", url: createPageUrl("CareDocuments"), icon: FolderOpen },
  { title: "Staff Supervisions", url: createPageUrl("SupervisionManagement"), icon: ClipboardList },
  { title: "Incident Management", url: createPageUrl("IncidentManagement"), icon: Shield },
  { title: "Payroll & Finance", url: createPageUrl("PayrollDashboard"), icon: FileText },
  { title: "Reports", url: createPageUrl("Reports"), icon: FileText },
  { title: "Notifications", url: createPageUrl("Notifications"), icon: Bell },
  { title: "Leave Requests", url: createPageUrl("LeaveRequests"), icon: ClipboardList },
  { title: "Daily Log", url: createPageUrl("DailyLog"), icon: ClipboardList },
];

const domCareNav = [
  { title: "Dom Care Dashboard", url: createPageUrl("DomCareDashboard"), icon: LayoutDashboard },
  { title: "Visit Schedule", url: createPageUrl("DomCareSchedule"), icon: MapPin },
  { title: "Staff", url: createPageUrl("DomCareStaff"), icon: Users },
  { title: "Clients", url: createPageUrl("DomCareClients"), icon: UserCircle },
  { title: "Care Documents", url: createPageUrl("CareDocuments"), icon: FolderOpen },
  { title: "Runs", url: createPageUrl("DomCareRuns"), icon: Navigation },
  { title: "Communications", url: createPageUrl("CommunicationHub"), icon: MessageSquare },
  { title: "Client Feedback", url: createPageUrl("ClientFeedback"), icon: MessageSquare },
  { title: "Training", url: createPageUrl("StaffTraining"), icon: GraduationCap },
  { title: "Reports", url: createPageUrl("DomCareReports"), icon: FileText },
];

const supportedLivingNav = [
  { title: "SL Dashboard", url: createPageUrl("SupportedLivingDashboard"), icon: LayoutDashboard },
  { title: "Clients", url: createPageUrl("SupportedLivingClients"), icon: UserCircle },
  { title: "Properties", url: createPageUrl("SupportedLivingProperties"), icon: Home },
  { title: "Schedule", url: createPageUrl("SupportedLivingSchedule"), icon: Calendar },
  { title: "Care Documents", url: createPageUrl("CareDocuments"), icon: FolderOpen },
];

const dayCentreNav = [
  { title: "Day Centre Dashboard", url: createPageUrl("DayCentreDashboard"), icon: LayoutDashboard },
  { title: "Clients", url: createPageUrl("DayCentreClients"), icon: UserCircle },
  { title: "Activities", url: createPageUrl("DayCentreActivities"), icon: Activity },
  { title: "Sessions", url: createPageUrl("DayCentreSessions"), icon: Calendar },
  { title: "Attendance", url: createPageUrl("DayCentreAttendance"), icon: ClipboardList },
  { title: "Care Documents", url: createPageUrl("CareDocuments"), icon: FolderOpen },
];

const staffNavigation = [
  { title: "Staff Portal", url: createPageUrl("StaffPortal"), icon: Smartphone },
];

const clientPortalNav = [
  { title: "Portal Home", url: createPageUrl("ClientPortal"), icon: Home },
  { title: "My Schedule", url: createPageUrl("ClientPortalSchedule"), icon: Calendar },
  { title: "Messages", url: createPageUrl("ClientPortalMessages"), icon: MessageSquare },
  { title: "Booking Requests", url: createPageUrl("ClientPortalBookings"), icon: ClipboardList },
];

const complianceNav = [
  { title: "Compliance Hub", url: createPageUrl("ComplianceHub"), icon: Shield },
  { title: "Task Center", url: createPageUrl("ComplianceTaskCenter"), icon: ClipboardList },
  { title: "Action Plan Progress", url: createPageUrl("ActionPlanProgress"), icon: ClipboardList },
  { title: "Audit Templates", url: createPageUrl("AuditTemplates"), icon: FileText },
  { title: "Form Builder", url: createPageUrl("FormBuilder"), icon: FileText },
];

const crmNav = [
  { title: "CRM Dashboard", url: createPageUrl("CRMDashboard"), icon: Users },
  { title: "Client Comms Hub", url: createPageUrl("ClientCommunicationHub"), icon: MessageSquare },
];

const systemNavigation = [
  { title: "Role Management", url: createPageUrl("RoleManagement"), icon: Shield, adminOnly: true },
  { title: "Module Settings", url: createPageUrl("ModuleSettings"), icon: Settings, adminOnly: true },
  { title: "User Management", url: createPageUrl("UserManagement"), icon: Users, adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = React.useState(false);
  const [enabledModules, setEnabledModules] = React.useState({
    residential_care: true,
    domiciliary_care: true,
    supported_living: true,
    day_centre: true,
  });
  const [portalAccess, setPortalAccess] = React.useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        try {
          const allAccess = await base44.entities.ClientPortalAccess.list();
          if (allAccess && Array.isArray(allAccess)) {
            const userAccess = allAccess.find(a => 
              a.user_email === userData.email && a.is_active
            );
            setPortalAccess(userAccess);
          }
        } catch (portalError) {
          console.log("Portal access not configured");
          setPortalAccess(null);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    // Load and apply accessibility settings
    const loadAccessibility = async () => {
      if (!user?.email) return;
      try {
        const settings = await base44.entities.AccessibilitySettings.filter({ user_email: user.email });
        if (Array.isArray(settings) && settings.length > 0) {
          applyAccessibilitySettings(settings[0]);
        }
      } catch (error) {
        console.log("No accessibility settings found");
      }
    };
    loadAccessibility();
  }, [user]);

  const applyAccessibilitySettings = (settings) => {
    const root = document.documentElement;
    if (settings.theme_mode === 'dark') {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#ffffff');
    } else if (settings.theme_mode === 'dyslexia') {
      root.style.setProperty('--bg-color', '#faf4e8');
      root.style.setProperty('--text-color', '#2c2c2c');
    } else {
      root.style.setProperty('--bg-color', settings.background_color || '#ffffff');
      root.style.setProperty('--text-color', settings.text_color || '#000000');
    }
    const sizes = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' };
    root.style.fontSize = sizes[settings.text_size] || '16px';
  };

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      try {
        const allSettings = await base44.entities.AppSettings.list();
        return Array.isArray(allSettings) ? allSettings : [];
      } catch (error) {
        console.log("App settings not configured");
        return [];
      }
    },
  });

  React.useEffect(() => {
    if (settings && Array.isArray(settings) && settings.length > 0) {
      const moduleSettings = settings.find(s => s.setting_key === 'enabled_modules');
      if (moduleSettings?.setting_value) {
        setEnabledModules(moduleSettings.setting_value);
      }
    }
  }, [settings]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      if (!user) return 0;
      try {
        const notifications = await base44.entities.Notification.filter({ is_read: false });
        return Array.isArray(notifications) ? notifications.length : 0;
      } catch (error) {
        return 0;
      }
    },
    enabled: !!user && enabledModules.residential_care,
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isPortalUser = !!portalAccess && user?.role !== 'admin';

  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside 
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900">CareRoster</h2>
                  <p className="text-xs text-gray-500">
                    {isPortalUser ? 'Client Portal' : 'Care Management'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full mt-4 flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left text-sm text-gray-600"
              >
                <Search className="w-4 h-4" />
                <span>Quick Search...</span>
                <kbd className="ml-auto px-2 py-0.5 bg-white border border-gray-300 rounded text-xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex-1 p-3">
              {isPortalUser ? (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                    Client Portal
                  </p>
                  <nav className="space-y-1">
                    {clientPortalNav.map((item) => {
                      if (item.title === "Booking Requests" && portalAccess && !portalAccess.can_request_bookings) {
                        return null;
                      }
                      
                      return (
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
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ) : (
                <>
                  {enabledModules.residential_care && (
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
                            <span className="text-sm">{item.title}</span>
                            {item.title === "Notifications" && unreadCount > 0 && (
                              <Badge className="ml-auto bg-red-500 text-white">{unreadCount}</Badge>
                            )}
                          </Link>
                        ))}
                      </nav>
                    </div>
                  )}

                  {enabledModules.domiciliary_care && (
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
                  )}

                  {enabledModules.supported_living && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                        Supported Living
                      </p>
                      <nav className="space-y-1">
                        {supportedLivingNav.map((item) => (
                          <Link
                            key={item.title}
                            to={item.url}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              location.pathname === item.url 
                                ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm' 
                                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm">{item.title}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  )}

                  {enabledModules.day_centre && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                        Day Centre
                      </p>
                      <nav className="space-y-1">
                        {dayCentreNav.map((item) => (
                          <Link
                            key={item.title}
                            to={item.url}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              location.pathname === item.url 
                                ? 'bg-amber-50 text-amber-700 font-medium shadow-sm' 
                                : 'text-gray-700 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm">{item.title}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  )}

                  <div className="mb-6">
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
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                      Compliance & Quality
                    </p>
                    <nav className="space-y-1">
                      {complianceNav.map((item) => (
                        <Link
                          key={item.title}
                          to={item.url}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            location.pathname === item.url 
                              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm' 
                              : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                      CRM & Intake
                    </p>
                    <nav className="space-y-1">
                      {crmNav.map((item) => (
                        <Link
                          key={item.title}
                          to={item.url}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            location.pathname === item.url 
                              ? 'bg-cyan-50 text-cyan-700 font-medium shadow-sm' 
                              : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-700'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>

                  {user?.role === 'admin' && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">
                        System
                      </p>
                      <nav className="space-y-1">
                        {systemNavigation.map((item) => (
                          <Link
                            key={item.title}
                            to={item.url}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              location.pathname === item.url 
                                ? 'bg-gray-100 text-gray-900 font-medium shadow-sm' 
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <item.icon className="w-5 h-5" />
                            <span className="text-sm">{item.title}</span>
                          </Link>
                        ))}
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>

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
                  <p className="text-xs text-gray-500 truncate">
                    {isPortalUser 
                      ? `${portalAccess?.relationship || 'Portal User'}`
                      : (user?.role || 'Staff')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAccessibilityOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Accessibility</span>
              </button>
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 lg:hidden sticky top-0 z-30 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="text-xl font-bold text-gray-900 flex-1">CareRoster</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="hover:bg-gray-100"
            >
              <Search className="w-5 h-5" />
            </Button>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="fade-in">
              {children}
            </div>
          </main>

          <KeyboardShortcuts />
          <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
          {accessibilityOpen && (
            <AccessibilityPanel onClose={() => setAccessibilityOpen(false)} />
          )}
          </div>
          </div>
          </ToastProvider>
          );
          }