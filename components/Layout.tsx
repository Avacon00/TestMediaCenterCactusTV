import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Film, Tv, Music, Settings, Menu, X, LogOut, ChevronLeft, ChevronRight, MonitorPlay, Heart } from 'lucide-react';
import { Button } from './Button';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
      localStorage.removeItem('cactus_server_url');
      localStorage.removeItem('cactus_onboarding_complete');
      window.location.reload();
  };

  const NavItem = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
    <NavLink 
      to={to}
      title={isCollapsed ? label : ''}
      onClick={() => setIsMobileMenuOpen(false)}
      className={({ isActive }) => 
        `flex items-center py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden ${
            isCollapsed ? 'justify-center px-2' : 'px-4 gap-3'
        } ${
          isActive 
            ? 'bg-cactus-600/10 text-cactus-400 border border-cactus-600/20' 
            : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
        }`
      }
    >
      <span className="shrink-0 flex items-center justify-center">{icon}</span>
      <span className={`font-medium transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
        {label}
      </span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-midnight-950 text-gray-100 font-sans flex overflow-hidden">
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-midnight-900/80 backdrop-blur rounded-full border border-white/10"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out
        bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        {/* Header */}
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all`}>
          {isCollapsed ? (
             <MonitorPlay size={32} className="text-cactus-500" />
          ) : (
             <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cactus-400 to-emerald-600 tracking-tight whitespace-nowrap overflow-hidden">
                CactusTV
             </h1>
          )}
        </div>

        {/* Toggle Button (Desktop Only) */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-8 bg-midnight-900 border border-white/10 rounded-full p-1 text-gray-400 hover:text-white hover:scale-110 transition-all z-50"
        >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          <NavItem to="/" icon={<Home size={20} />} label="Home" />
          <NavItem to="/movies" icon={<Film size={20} />} label="Movies" />
          <NavItem to="/shows" icon={<Tv size={20} />} label="TV Shows" />
          <NavItem to="/music" icon={<Music size={20} />} label="Music" />
          <NavItem to="/favorites" icon={<Heart size={20} />} label="Favorites" />
          
          <div className="pt-8 pb-2">
            {!isCollapsed && <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 animate-fade-in">System</p>}
            {isCollapsed && <div className="h-px bg-white/5 mx-2 mb-4" />}
            <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
          </div>
        </nav>

        <div className="p-4 border-t border-white/5">
             <Button 
                variant="ghost" 
                className={`w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`} 
                onClick={handleLogout} 
                icon={<LogOut size={18} />}
                title={isCollapsed ? "Disconnect" : ""}
             >
                {!isCollapsed && "Disconnect"}
             </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative scroll-smooth bg-midnight-950">
        <Outlet />
      </main>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};