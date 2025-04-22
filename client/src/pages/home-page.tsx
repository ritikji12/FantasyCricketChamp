import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/header';
import Footer from '@/components/footer';
import MatchBanner from '@/components/match-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  
  // Fetch contests to display available contests to users
  const { data: contests = [], isLoading: isLoadingContests } = useQuery({
    queryKey: ['/api/contests'],
    enabled: !!user
  });
  
  // Fetch matches to display match information
  const { data: matches = [], isLoading: isLoadingMatches } = useQuery({
    queryKey: ['/api/matches'],
    enabled: !!user
  });

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
            <div className="mt-6 space-y-6">
              {/* Team Management Card */}
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
              
              {/* Available Contests Card */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-montserrat font-bold text-2xl mb-4">Available Contests</h2>
                  {isLoadingContests ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : contests.length > 0 ? (
                    <div className="space-y-4">
                      {contests.map((contest: any) => (
                        <div key={contest.id} className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-lg">{contest.name}</h3>
                              <p className="text-gray-600 text-sm mt-1">{contest.description}</p>
                            </div>
                            <Badge className={contest.isLive ? "bg-green-500" : "bg-gray-400"}>
                              {contest.isLive ? 'LIVE' : 'UPCOMING'}
                            </Badge>
                          </div>
                          <div className="flex justify-between mt-3 text-sm">
                            <span className="text-gray-500">Entry: {contest.entryFee} points</span>
                            <span className="text-gray-500">Max Entries: {contest.maxEntries}</span>
                          </div>
                          <div className="mt-4">
                            <Button 
                              size="sm" 
                              className="w-full md:w-auto"
                              disabled={!contest.isLive}
                              onClick={() => navigate('/team/create?contestId=' + contest.id)}
                            >
                              {contest.isLive ? 'Join Contest' : 'Not Available Yet'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No contests available at the moment. Check back soon!
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Live Matches Card */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-montserrat font-bold text-2xl mb-4">Live Matches</h2>
                  {isLoadingMatches ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : matches.length > 0 ? (
                    <div className="space-y-4">
                      {matches.map((match: any) => (
                        <div key={match.id} className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-bold text-lg">{match.team1} vs {match.team2}</h3>
                              <p className="text-gray-600 text-sm mt-1">{match.venue}</p>
                            </div>
                            <Badge 
                              className={
                                match.status === 'live' ? "bg-green-500" : 
                                match.status === 'completed' ? "bg-gray-500" : 
                                "bg-blue-500"
                              }
                            >
                              {match.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No matches available at the moment. Check back soon!
                    </div>
                  )}
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
