import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LayoutGrid, Dumbbell, Ruler, LayoutTemplate, CalendarDays, LogOut } from "lucide-react";

const navItems = [
    { to: "/dashboard", label: "Overview", icon: LayoutGrid, testId: "nav-dashboard" },
    { to: "/routines", label: "Routines", icon: Dumbbell, testId: "nav-routines" },
    { to: "/measurements", label: "Body", icon: Ruler, testId: "nav-measurements" },
    { to: "/templates", label: "Templates", icon: LayoutTemplate, testId: "nav-templates" },
    { to: "/calendar", label: "Calendar", icon: CalendarDays, testId: "nav-calendar" },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isNavActive = (to) => {
        if (to === "/routines") {
            return location.pathname === "/routines" || location.pathname.startsWith("/routines/");
        }
        return location.pathname === to || location.pathname.startsWith(to + "/");
    };

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="h-screen bg-background text-foreground flex overflow-hidden">
            <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-white h-screen sticky top-0">
                <div className="px-6 py-8 border-b border-border">
                    <div className="font-display text-2xl font-extrabold tracking-tighter">GymTrack</div>
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground mt-1">Gym Progress</div>
                </div>
                <nav className="flex-1 py-6">
                    {navItems.map(({ to, label, icon: Icon, testId }) => {
                        const active = isNavActive(to);
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                data-testid={testId}
                                className={`flex items-center gap-3 px-6 py-3 text-sm border-l-2 transition-colors ${
                                    active
                                        ? "border-accent text-foreground font-semibold bg-muted"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                }`}
                            >
                                <Icon className="h-4 w-4" strokeWidth={1.5} />
                                <span className="tracking-tight">{label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
                <div className="border-t border-border p-4 flex items-center gap-3">
                    {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-9 h-9 object-cover" />
                    ) : (
                        <div className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {(user?.name || "U")[0]}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{user?.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </div>
                    <button
                        data-testid="logout-btn"
                        onClick={handleLogout}
                        className="p-2 hover:bg-muted transition-colors"
                        title="Log out"
                    >
                        <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-white shrink-0">
                    <div className="font-display text-lg font-extrabold tracking-tighter">GymTrack</div>
                    <button data-testid="logout-btn-mobile" onClick={handleLogout} className="p-2">
                        <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </header>
                <nav className="md:hidden flex overflow-x-auto border-b border-border bg-white shrink-0">
                    {navItems.map(({ to, label, testId }) => {
                        const active = isNavActive(to);
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                data-testid={`${testId}-mobile`}
                                className={`px-4 py-3 text-xs uppercase tracking-wider whitespace-nowrap border-b-2 ${
                                    active ? "border-accent text-foreground font-semibold" : "border-transparent text-muted-foreground"
                                }`}
                            >
                                {label}
                            </NavLink>
                        );
                    })}
                </nav>
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
