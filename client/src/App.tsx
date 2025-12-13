import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@shared/schema";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import UsersManagement from "@/pages/UsersManagement";
import AddUser from "@/pages/AddUser";
import FacultyDashboard from "@/pages/FacultyDashboard";
import MyProjects from "@/pages/MyProjects";
import EditorDashboard from "@/pages/EditorDashboard";
import FinalDecisionsPage from "@/pages/FinalDecisionsPage";
import ReviewerDashboard from "@/pages/ReviewerDashboard";
import AssignedProjects from "@/pages/AssignedProjects";
import AdminOverview from "@/pages/AdminOverview";
import AdminProjects from "@/pages/AdminProjects";
import AdminActivityLogs from "@/pages/AdminActivityLogs";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Hide sidebar on landing page
  const isLandingPage = location === "/welcome";

  if (isLandingPage) {
    return (
      <div className="flex h-screen w-full flex-col">
        <main className="flex-1 overflow-auto">
          <Landing />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <Navbar />
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/">
                {user.role === USER_ROLES.EDITOR ? (
                  <AdminOverview />
                ) : user.role === USER_ROLES.REVIEWER ? (
                  <ReviewerDashboard />
                ) : (
                  <FacultyDashboard />
                )}
              </Route>
              <Route path="/welcome" component={Landing} />
              <Route path="/profile" component={Profile} />
              
              {/* Editor/Admin Routes */}
              <Route path="/admin/overview">
                {user.role === USER_ROLES.EDITOR ? (
                  <AdminOverview />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>
              <Route path="/admin/projects">
                {user.role === USER_ROLES.EDITOR ? (
                  <AdminProjects />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>
              <Route path="/admin/users">
                {user.role === USER_ROLES.EDITOR ? (
                  <UsersManagement />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>
              <Route path="/admin/users/add">
                {user.role === USER_ROLES.EDITOR ? (
                  <AddUser />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>
              <Route path="/admin/logs">
                {user.role === USER_ROLES.EDITOR ? (
                  <AdminActivityLogs />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>

              {/* Editor Assign Projects Route */}
              <Route path="/editor/assign">
                {user.role === USER_ROLES.EDITOR ? (
                  <EditorDashboard />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>

              {/* Editor Final Decisions Route */}
              <Route path="/editor/decisions">
                {user.role === USER_ROLES.EDITOR ? (
                  <FinalDecisionsPage />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>

              {/* Reviewer Routes */}
              <Route path="/reviewer/dashboard" component={ReviewerDashboard} />
              <Route path="/assigned" component={AssignedProjects} />

              {/* Faculty Routes */}
              <Route path="/my-projects" component={MyProjects} />
              <Route path="/users">
                {user.role === USER_ROLES.EDITOR ? (
                  <UsersManagement />
                ) : (
                  <div className="text-center py-16">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">You don't have permission to access this page.</p>
                  </div>
                )}
              </Route>
              
              <Route path="/notifications">
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold mb-2">Notifications</h2>
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route component={AuthenticatedApp} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
