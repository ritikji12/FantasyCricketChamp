import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Footer from '@/components/footer';
import MatchBanner from '@/components/match-banner';
import TeamStats from '@/components/team-stats';
import Leaderboard from '@/components/leaderboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TeamViewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);
  
  // Get user team
  const { data: teamData, isLoading: isLoadingTeam, error } = useQuery({
    queryKey: ['/api/teams/my-team'],
    enabled: Boolean(user),
  });
  
  // Get leaderboard
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['/api/leaderboard'],
    enabled: Boolean(user),
  });
  
  // Handle error - user doesn't have a team
  useEffect(() => {
    if (error) {
      toast({
        title: "You don't have a team yet",
        description: "Create a team to join the contest!",
        variant: "destructive",
      });
      navigate('/team/create');
    }
  }, [error, navigate, toast]);
  
  const handleCreateTeam = () => {
    navigate('/team/create');
  };
  
  if (isLoadingTeam || isLoadingLeaderboard) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!teamData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-6">
            <MatchBanner />
            <Card className="mt-6">
              <CardContent className="pt-6 text-center">
                <h2 className="font-montserrat font-bold text-xl mb-4">You don't have a team yet</h2>
                <p className="text-gray-600 mb-6">Create your fantasy cricket team to join the contest!</p>
                <Button 
                  onClick={handleCreateTeam}
                  className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90"
                >
                  Create Your Team
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Match Banner */}
          <MatchBanner />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Team info and points */}
            <div className="lg:col-span-2">
              <TeamStats teamData={teamData} />
            </div>
            
            {/* Contest leaderboard */}
            <div>
              <Leaderboard 
                leaderboard={leaderboard} 
                currentTeamId={teamData.team.id} 
              />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
