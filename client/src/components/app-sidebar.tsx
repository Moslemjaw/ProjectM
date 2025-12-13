import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Home, FileText, Folder, Users, Globe, LayoutDashboard, Activity, CheckCircle2, ClipboardCheck, UserPlus, UserCheck, GraduationCap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { USER_ROLES } from "@shared/schema";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const facultyItems = [
    { title: "Home Page", url: "/welcome", icon: Globe },
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Projects", url: "/my-projects", icon: Folder },
  ];

  const editorItems = [
    { title: "Home Page", url: "/welcome", icon: Globe },
    { title: "Overview", url: "/admin/overview", icon: LayoutDashboard },
    { title: "Assign Projects", url: "/editor/assign", icon: UserCheck },
    { title: "Final Decisions", url: "/editor/decisions", icon: GraduationCap },
    { title: "All Projects", url: "/admin/projects", icon: FileText },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Add User", url: "/admin/users/add", icon: UserPlus },
    { title: "Activity Logs", url: "/admin/logs", icon: Activity },
  ];

  const reviewerItems = [
    { title: "Home Page", url: "/welcome", icon: Globe },
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Accepted Projects", url: "/assigned", icon: CheckCircle2 },
  ];

  const menuItems = user?.role === USER_ROLES.EDITOR
    ? editorItems
    : user?.role === USER_ROLES.REVIEWER 
    ? reviewerItems 
    : facultyItems;

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Project Management</h2>
            <p className="text-xs text-muted-foreground">Research System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // For editor, match both / and /admin/overview as active for "Overview"
                // Also match both / and /editor/assign as active for "Assign Projects"
                const isActive = user?.role === USER_ROLES.EDITOR && item.url === "/admin/overview" 
                  ? (location === "/" || location === "/admin/overview")
                  : user?.role === USER_ROLES.EDITOR && item.url === "/editor/assign"
                  ? (location === "/" || location === "/editor/assign")
                  : user?.role === USER_ROLES.REVIEWER && item.url === "/"
                  ? (location === "/" )
                  : location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
