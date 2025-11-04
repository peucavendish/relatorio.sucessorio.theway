import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Sun, Moon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
  showSummaryToggle?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, showLogout = false, showSummaryToggle = true }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header className="w-full py-3 animate-fade-in">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {theme === 'light' ? (
            <img
              src="/logo-light.png"
              alt="Logo"
              width={80}
              height={24}
              className="h-6 w-auto object-contain"
            />
          ) : (
            <img
              src="/logo-dark.png"
              alt="Logo"
              width={80}
              height={24}
              className="h-6 w-auto object-contain"
            />
          )}
          {title && (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
