import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Footer from '@/components/footer';
import MatchBanner from '@/components/match-banner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import PlayerCard from '@/components/player-card';

export default function TeamCreatePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);
  
  // Check if user already has a team
  const { data: userTeam, isLoading: isCheckingTeam } = useQuery({
    queryKey: ['/api/teams/my-team'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: Boolean(user),
  });
  
  // Redirect if user already has a team
  useEffect(() => {
    if (userTeam) {
      navigate('/team/view');
      toast({
        title: "You already have a team",
        description: "You can view your team's performance here.",
      });
    }
  }, [userTeam, navigate, toast]);
  
  // Fetch player categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/players/categories'],
    enabled: Boolean(user && !userTeam),
  });
  
  // Fetch all players
  const { data: players = [], isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['/api/players'],
    enabled: Boolean(user && !userTeam),
  });
  
  // Group players by category
  const playersByCategory = React.useMemo(() => {
    const grouped: Record<string, typeof players> = {};
    
    categories.forEach(cat => {
      grouped[cat.name] = players.filter(player => player.categoryId === cat.id);
    });
    
    return grouped;
  }, [players, categories]);
  
  // Fixed wicketkeeper
  const wicketkeeper = React.useMemo(() => {
    return players.find(player => 
      categories.find(cat => cat.id === player.categoryId)?.name === "Wicketkeeper"
    );
  }, [players, categories]);
  
  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: { teamName: string, playerIds: number[], wicketkeeper: string }) => {
      const res = await apiRequest("POST", "/api/teams", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/my-team'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      
      toast({
        title: "Team created successfully",
        description: "Your team has been created and joined the contest!",
      });
      
      navigate('/team/view');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create team",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handlePlayerToggle = (playerId: number) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast({
        title: "Team name required",
        description: "Please enter a name for your team.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedPlayers.length === 0) {
      toast({
        title: "No players selected",
        description: "Please select at least one player for your team.",
        variant: "destructive",
      });
      return;
    }
    
    createTeamMutation.mutate({
      teamName: teamName.trim(),
      playerIds: selectedPlayers,
      wicketkeeper: "None"
    });
  };
  
  if (isCheckingTeam || isLoadingCategories || isLoadingPlayers) {
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Match Banner */}
          <MatchBanner />
          
          {/* Team Creation Form */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h2 className="font-montserrat font-bold text-xl mb-4">Create Your Fantasy Team</h2>
              <p className="text-gray-600 mb-4">
                Select players for your team. You can choose any number of batsmen, bowlers, and all-rounders, 
                but only one wicketkeeper (fixed as "None").
              </p>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <Label htmlFor="team-name" className="block text-gray-700 mb-2 font-medium">Team Name</Label>
                  <Input 
                    id="team-name" 
                    value={teamName} 
                    onChange={(e) => setTeamName(e.target.value)} 
                    className="w-full"
                    placeholder="Enter your team name"
                    required
                  />
                </div>
                
                {/* Player selection */}
                <div className="space-y-6 mt-6">
                  {/* All Rounders Section */}
                  {playersByCategory["All Rounder"]?.length > 0 && (
                    <div>
                      <h3 className="font-montserrat font-bold text-lg mb-3 text-[#2ABDC0] flex items-center">
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        All Rounders
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {playersByCategory["All Rounder"].map(player => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            category="All Rounder"
                            isSelected={selectedPlayers.includes(player.id)}
                            onToggle={() => handlePlayerToggle(player.id)}
                            color="#2ABDC0"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Batsmen Section */}
                  {playersByCategory["Batsman"]?.length > 0 && (
                    <div>
                      <h3 className="font-montserrat font-bold text-lg mb-3 text-[#FF0066] flex items-center">
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Batsmen
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {playersByCategory["Batsman"].map(player => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            category="Batsman"
                            isSelected={selectedPlayers.includes(player.id)}
                            onToggle={() => handlePlayerToggle(player.id)}
                            color="#FF0066"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Bowlers Section */}
                  {playersByCategory["Bowler"]?.length > 0 && (
                    <div>
                      <h3 className="font-montserrat font-bold text-lg mb-3 text-[#5A0001] flex items-center">
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Bowlers
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {playersByCategory["Bowler"].map(player => (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            category="Bowler"
                            isSelected={selectedPlayers.includes(player.id)}
                            onToggle={() => handlePlayerToggle(player.id)}
                            color="#5A0001"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Wicketkeeper Section (Fixed as None) */}
                  <div>
                    <h3 className="font-montserrat font-bold text-lg mb-3 text-gray-600 flex items-center">
                      <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Wicketkeeper
                    </h3>
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <h4 className="font-medium text-gray-800 mb-1">{wicketkeeper?.name || 'None'}</h4>
                      <p className="text-sm text-gray-500">Wicketkeeper position is fixed as "None" for this contest.</p>
                      <input type="hidden" name="wicketkeeper" value="None" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    type="submit" 
                    className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90 py-6 h-auto"
                    disabled={createTeamMutation.isPending}
                  >
                    {createTeamMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Team & Join Contest
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

function getQueryFn<T>(options: { on401: "returnNull" | "throw" }) {
  return async ({ queryKey }: { queryKey: string[] }) => {
    try {
      const res = await fetch(queryKey[0] as string, { credentials: "include" });
      
      if (options.on401 === "returnNull" && res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || res.statusText);
      }
      
      return await res.json() as T;
    } catch (error) {
      if (options.on401 === "returnNull") {
        return null;
      }
      throw error;
    }
  };
}
