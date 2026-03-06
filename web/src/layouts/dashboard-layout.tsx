import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UsersRound,
  LayoutDashboard,
  Handshake,
  LogOut,
  Sun,
  Moon,
  Search,
  ChevronDown,
} from 'lucide-react';
import { CommandPalette } from '@/components/command-palette';
import { useState } from 'react';

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Pipeline', to: '/pipeline', icon: Handshake },
  { label: 'Equipe', to: '/team', icon: UsersRound },
];

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="currentColor"
            className="text-primary-foreground"
          />
          <path
            d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9S16.97 3 12 3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            className="text-primary-foreground"
            fill="none"
          />
        </svg>
      </div>
      <span className="text-sm font-bold tracking-tight text-foreground">
        Orbit CRM
      </span>
    </div>
  );
}

interface NavItemProps {
  label: string;
  to: string;
  icon: React.ElementType;
  isActive: boolean;
}

function NavItem({ label, to, icon: Icon, isActive }: NavItemProps) {
  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      ].join(' ')}
    >
      <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
      {label}
    </Link>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </Button>
  );
}

interface UserMenuProps {
  email: string;
  role: string;
  onLogout: () => void;
}

function UserMenu({ email, role, onLogout }: UserMenuProps) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-primary">
              {initials}
            </span>
          </div>
          <span className="text-xs max-w-[120px] truncate hidden sm:block">
            {email}
          </span>
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {role}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive cursor-pointer text-sm"
        >
          <LogOut size={13} className="mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 flex flex-col border-r border-border bg-sidebar flex-shrink-0">
        <BrandLogo />

        <div className="h-px bg-border mx-4" />

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navigationItems.map(({ label, to, icon }) => (
            <NavItem
              key={to}
              label={label}
              to={to}
              icon={icon}
              isActive={location.pathname === to}
            />
          ))}
        </nav>

        <div className="h-px bg-border mx-4" />

        <div className="px-3 py-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 border border-border/50"
          >
            <Search size={13} />
            <span className="text-xs flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
              ⌘K
            </kbd>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-12 flex items-center justify-end px-4 border-b border-border gap-1 flex-shrink-0 bg-background">
          <ThemeToggleButton />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Sair"
          >
            <LogOut size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          {user && (
            <UserMenu
              email={user.email}
              role={user.role}
              onLogout={handleLogout}
            />
          )}
        </header>

        <main className="flex-1 overflow-hidden bg-background">
          {location.pathname === '/pipeline' ? (
            <Outlet />
          ) : (
            <div className="h-full overflow-auto orbit-scroll">
              <div className="mx-auto w-full max-w-6xl px-6 py-6">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
