import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Footer from '@/components/footer';
import MatchBanner from '@/components/match-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();

  const handleCreateTeam = () => {
    navigate('/team/create');
  };
  
  const handleViewTeam = () => {
    navigate('/team/view');
  };
  
  const handleAdminDashboard = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Match Banner */}
          <MatchBanner />
          
          {/* Content based on user type */}
          {!user ? (
            <GuestView />
          ) : isAdmin ? (
            <div className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-montserrat font-bold text-2xl mb-4">Admin Dashboard</h2>
                  <p className="text-gray-600 mb-6">
                    As an admin, you can manage player scores and view all registered teams.
                  </p>
                  <Button 
                    onClick={handleAdminDashboard}
                    className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90"
                  >
                    Go to Admin Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-montserrat font-bold text-2xl mb-4">Your Fantasy Cricket Team</h2>
                  <p className="text-gray-600 mb-6">
                    Create your dream team with any number of batsmen, bowlers, and all-rounders.
                    You can track your team's performance and ranking in real-time!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleCreateTeam}
                      className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90"
                    >
                      Create Your Team
                    </Button>
                    <Button 
                      onClick={handleViewTeam}
                      variant="outline"
                    >
                      View Your Team
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

function GuestView() {
  const [, navigate] = useLocation();
  
  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="text-center">
          <h2 className="font-montserrat font-bold text-2xl mb-3">Join The Cricket Fantasy League</h2>
          <p className="text-gray-600 mb-6">Create your dream team and compete against others in the ultimate cricket fantasy experience!</p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90 px-6 py-6 h-auto"
            >
              Login to Play
            </Button>
            <Button 
              onClick={() => navigate('/auth?tab=register')}
              className="bg-[#FFBA08] hover:bg-[#FFBA08]/90 px-6 py-6 h-auto"
            >
              Sign Up Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
