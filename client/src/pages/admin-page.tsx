import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Footer from '@/components/footer';
import MatchBanner from '@/components/match-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { UpdatePlayerPoints } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Redirect if not admin
  React.useEffect(() => {
    if (user && !isAdmin) {
      navigate('/');
    } else if (!user) {
      navigate('/auth');
    }
  }, [user, isAdmin, navigate]);

  // Fetch players
  const { data: players = [], isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['/api/players'],
    enabled: Boolean(isAdmin)
  });

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/players/categories'],
    enabled: Boolean(isAdmin)
  });

  // Fetch teams
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery({
    queryKey: ['/api/admin/teams'],
    enabled: Boolean(isAdmin)
  });

  // Update player points mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async (player: UpdatePlayerPoints) => {
      const res = await apiRequest("PATCH", `/api/admin/players/${player.id}/points`, player);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      toast({
        title: "Player scores updated",
        description: "All team rankings have been recalculated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update player scores",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Group players by category
  const playersByCategory = React.useMemo(() => {
    const grouped: Record<string, typeof players> = {};
    
    categories.forEach(cat => {
      grouped[cat.name] = players.filter(player => player.categoryId === cat.id);
    });
    
    return grouped;
  }, [players, categories]);

  // Form state for player updates
  const [playerUpdates, setPlayerUpdates] = useState<Record<number, UpdatePlayerPoints>>({});

  const handleInputChange = (playerId: number, field: keyof UpdatePlayerPoints, value: string) => {
    const numValue = parseInt(value) || 0;
    
    setPlayerUpdates(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        id: playerId,
        [field]: numValue
      }
    }));
  };

  const handleUpdateScores = async () => {
    const updates = Object.values(playerUpdates);
    if (updates.length === 0) {
      toast({
        title: "No changes to update",
        description: "Make some changes to player scores first.",
      });
      return;
    }
    
    for (const update of updates) {
      await updatePlayerMutation.mutateAsync(update);
    }
    
    setPlayerUpdates({});
  };

  // Calculate player selection stats
  const playerStats = React.useMemo(() => {
    if (!teams.length) return {};
    
    const stats: Record<number, { count: number, percentage: number }> = {};
    const totalTeams = teams.length;
    
    players.forEach(player => {
      let count = 0;
      teams.forEach(teamData => {
        if (teamData.players.some((p: any) => p.id === player.id)) {
          count++;
        }
      });
      
      stats[player.id] = {
        count,
        percentage: Math.round((count / totalTeams) * 100)
      };
    });
    
    return stats;
  }, [teams, players]);

  // Find most selected player
  const mostSelectedPlayer = React.useMemo(() => {
    if (!playerStats || Object.keys(playerStats).length === 0) return null;
    
    let maxId = 0;
    let maxPercentage = 0;
    
    Object.entries(playerStats).forEach(([id, stats]) => {
      if (stats.percentage > maxPercentage) {
        maxId = parseInt(id);
        maxPercentage = stats.percentage;
      }
    });
    
    const player = players.find(p => p.id === maxId);
    return player ? { player, percentage: maxPercentage } : null;
  }, [playerStats, players]);

  if (isLoadingPlayers || isLoadingCategories || isLoadingTeams) {
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Admin controls */}
            <div className="lg:col-span-2">
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h2 className="font-montserrat font-bold text-xl mb-4">Admin Dashboard</h2>
                  
                  <div className="mb-6">
                    <h3 className="font-montserrat font-medium text-lg mb-3">Update Player Scores</h3>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Changes will instantly update all team scores and rankings
                      </p>
                    </div>
                    
                    {/* Player score updater */}
                    <div className="space-y-4">
                      {/* All Rounders */}
                      {playersByCategory["All Rounder"]?.length > 0 && (
                        <div className="bg-[#2ABDC0]/5 p-4 rounded-md">
                          <h4 className="font-medium mb-3">All Rounders</h4>
                          <div className="space-y-3">
                            {playersByCategory["All Rounder"].map(player => (
                              <div key={player.id} className="flex flex-wrap items-center justify-between">
                                <span className="font-medium w-24">{player.name}</span>
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Runs</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20"
                                      value={(playerUpdates[player.id]?.runs !== undefined ? playerUpdates[player.id].runs : player.runs) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'runs', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Wickets</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20"
                                      value={(playerUpdates[player.id]?.wickets !== undefined ? playerUpdates[player.id].wickets : player.wickets) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'wickets', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Points</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20 font-bold text-[#FFBA08]"
                                      value={(playerUpdates[player.id]?.points !== undefined ? playerUpdates[player.id].points : player.points) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'points', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Batsmen */}
                      {playersByCategory["Batsman"]?.length > 0 && (
                        <div className="bg-[#FF0066]/5 p-4 rounded-md">
                          <h4 className="font-medium mb-3">Batsmen</h4>
                          <div className="space-y-3">
                            {playersByCategory["Batsman"].map(player => (
                              <div key={player.id} className="flex flex-wrap items-center justify-between">
                                <span className="font-medium w-24">{player.name}</span>
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Runs</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20"
                                      value={(playerUpdates[player.id]?.runs !== undefined ? playerUpdates[player.id].runs : player.runs) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'runs', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Points</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20 font-bold text-[#FFBA08]"
                                      value={(playerUpdates[player.id]?.points !== undefined ? playerUpdates[player.id].points : player.points) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'points', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Bowlers */}
                      {playersByCategory["Bowler"]?.length > 0 && (
                        <div className="bg-[#5A0001]/5 p-4 rounded-md">
                          <h4 className="font-medium mb-3">Bowlers</h4>
                          <div className="space-y-3">
                            {playersByCategory["Bowler"].map(player => (
                              <div key={player.id} className="flex flex-wrap items-center justify-between">
                                <span className="font-medium w-24">{player.name}</span>
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Wickets</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20"
                                      value={(playerUpdates[player.id]?.wickets !== undefined ? playerUpdates[player.id].wickets : player.wickets) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'wickets', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500 block">Points</Label>
                                    <Input 
                                      type="number" 
                                      className="w-20 font-bold text-[#FFBA08]"
                                      value={(playerUpdates[player.id]?.points !== undefined ? playerUpdates[player.id].points : player.points) || 0}
                                      onChange={(e) => handleInputChange(player.id, 'points', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        onClick={handleUpdateScores}
                        className="mt-4 bg-[#2ABDC0] hover:bg-[#2ABDC0]/90"
                        disabled={updatePlayerMutation.isPending || Object.keys(playerUpdates).length === 0}
                      >
                        {updatePlayerMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Update All Scores
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* User teams list */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-montserrat font-bold text-lg mb-4">Registered Teams</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teams.map((teamData: any) => (
                          <tr key={teamData.team.id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{teamData.team.name}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{teamData.user?.email}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{teamData.playerCount} players</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-[#FFBA08]">{teamData.totalPoints} pts</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{teamData.rank}</div>
                            </td>
                          </tr>
                        ))}
                        {teams.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500">
                              No teams registered yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Contest stats */}
            <div>
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="font-montserrat font-bold text-lg mb-4">Contest Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-600">Total Teams</span>
                      <span className="font-bold text-lg">{teams.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-600">Most Selected Player</span>
                      <span className="font-bold">
                        {mostSelectedPlayer 
                          ? `${mostSelectedPlayer.player.name} (${mostSelectedPlayer.percentage}%)`
                          : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-600">Highest Points</span>
                      <span className="font-bold text-[#FFBA08]">
                        {teams.length > 0 
                          ? `${teams[0].totalPoints} pts` 
                          : '0 pts'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="text-sm">Just now</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-montserrat font-bold text-lg mb-4">Player Selection %</h3>
                  <div className="space-y-3">
                    {players.slice(0, 5).map(player => {
                      const stat = playerStats[player.id] || { percentage: 0 };
                      return (
                        <div key={player.id} className="relative pt-1">
                          <div className="flex mb-2 items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{player.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-gray-800">{stat.percentage}%</span>
                            </div>
                          </div>
                          <Progress 
                            value={stat.percentage} 
                            className="h-2" 
                            indicatorColor="bg-[#2ABDC0]"
                          />
                        </div>
                      );
                    })}
                    
                    {players.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No player statistics available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
