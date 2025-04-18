import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Menu, X } from 'lucide-react';
import AvatarLogo from './ui/avatar-logo';

export default function Header() {
  const { user, logoutMutation, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center">
              <AvatarLogo className="mr-3" />
              <h1 className="font-montserrat font-bold text-2xl">
                <span className="text-[#5A0001]">CR</span>
                <span className="text-[#2ABDC0]">13K3</span>
                <span className="text-[#FF0066]">T FC</span>
              </h1>
            </a>
          </Link>
        </div>
        
        {/* Navigation links visible on desktop */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/">
            <a className="text-gray-700 hover:text-[#2ABDC0] font-montserrat font-medium">Home</a>
          </Link>
          
          {user && !isAdmin && (
            <Link href="/team/view">
              <a className="text-gray-700 hover:text-[#2ABDC0] font-montserrat font-medium">My Team</a>
            </Link>
          )}
          
          {isAdmin && (
            <Link href="/admin">
              <a className="text-gray-700 hover:text-[#2ABDC0] font-montserrat font-medium">Admin</a>
            </Link>
          )}
          
          {/* Auth buttons - show based on auth state */}
          {!user ? (
            <div className="flex space-x-2">
              <Button
                onClick={() => navigate('/auth')}
                className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate('/auth?tab=register')}
                className="bg-[#FFBA08] hover:bg-[#FFBA08]/90"
              >
                Sign Up
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <span>{user.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/team/view')}>
                    My Team
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-500" 
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-inner">
          <div className="container mx-auto px-4 py-3 space-y-3">
            <Link href="/">
              <a className="block py-2 text-gray-700 font-medium">Home</a>
            </Link>
            
            {user && !isAdmin && (
              <Link href="/team/view">
                <a className="block py-2 text-gray-700 font-medium">My Team</a>
              </Link>
            )}
            
            {isAdmin && (
              <Link href="/admin">
                <a className="block py-2 text-gray-700 font-medium">Admin</a>
              </Link>
            )}
            
            {/* Auth buttons for mobile */}
            {!user ? (
              <div className="flex space-x-2 py-2">
                <Button
                  onClick={() => {
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                  className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90 flex-1"
                >
                  Login
                </Button>
                <Button
                  onClick={() => {
                    navigate('/auth?tab=register');
                    setMobileMenuOpen(false);
                  }}
                  className="bg-[#FFBA08] hover:bg-[#FFBA08]/90 flex-1"
                >
                  Sign Up
                </Button>
              </div>
            ) : (
              <div className="py-2">
                <div className="flex justify-between items-center">
                  <span>{user.name}</span>
                  <Button
                    variant="ghost"
                    className="text-red-500"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
