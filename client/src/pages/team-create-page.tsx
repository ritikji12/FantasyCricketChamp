import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Footer from '@/components/footer';
import MatchBanner from '@/components/match-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Crown, Award, AlertCircle } from 'lucide-react';
import PlayerCard from '@/components/player-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function TeamCreatePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
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
  
  // Calculate total credits used
  const totalCredits = React.useMemo(() => {
    return selectedPlayers.reduce((total, playerId) => {
      const player = players.find(p => p.id === playerId);
      return total + (player?.points || 0);
    }, 0);
  }, [selectedPlayers, players]);
  
  // Get selected player objects
  const selectedPlayerObjects = React.useMemo(() => {
    return selectedPlayers.map(id => players.find(p => p.id === id)).filter(Boolean);
  }, [selectedPlayers, players]);
  
  // Functions to handle captain and vice-captain selection
  const handleCaptainSelect = (playerId: number) => {
    // If this player is already the vice-captain, remove that selection
    if (viceCaptainId === playerId) {
      setViceCaptainId(null);
    }
    setCaptainId(playerId);
  };
  
  const handleViceCaptainSelect = (playerId: number) => {
    // If this player is already the captain, remove that selection
    if (captainId === playerId) {
      setCaptainId(null);
    }
    setViceCaptainId(playerId);
  };
  
  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: { 
      teamName: string, 
      playerIds: number[], 
      captainId: number, 
      viceCaptainId: number, 
      wicketkeeper: string,
      totalCredits: number
    }) => {
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
        // Remove player from selection
        const newSelection = prev.filter(id => id !== playerId);
        
        // We will handle captain and vice-captain updates separately
        return newSelection;
      } else {
        // Check if adding would exceed 1000 credits
        const playerToAdd = players.find(p => p.id === playerId);
        const newTotal = totalCredits + (playerToAdd?.points || 0);
        
        if (newTotal > 1000) {
          toast({
            title: "Credit limit exceeded",
            description: "You can only use a maximum of 1000 credits for your team.",
            variant: "destructive",
          });
          return prev;
        }
        
        return [...prev, playerId];
      }
    });
  };
  
  // Effect to handle captain/vice-captain changes when players are removed
  React.useEffect(() => {
    // If captain is not in the selected players, reset it
    if (captainId && !selectedPlayers.includes(captainId)) {
      setCaptainId(null);
    }
    
    // If vice-captain is not in the selected players, reset it
    if (viceCaptainId && !selectedPlayers.includes(viceCaptainId)) {
      setViceCaptainId(null);
    }
  }, [selectedPlayers, captainId, viceCaptainId]);
  
  const handleSubmitPreview = () => {
    if (!teamName.trim()) {
      toast({
        title: "Team name required",
        description: "Please enter a name for your team.",
        variant: "destructive",
      });
      return;
    }

    const selectedBowlers = selectedPlayerObjects.filter(
      player => getPlayerCategory(player.id) === "Bowler"
    ).length;

    if (selectedBowlers < 2) {
      toast({
        title: "Insufficient bowlers",
        description: "You must select at least 2 bowlers for your team.",
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
    
    if (!captainId) {
      toast({
        title: "Captain required",
        description: "Please select a captain for your team (2x points).",
        variant: "destructive",
      });
      return;
    }
    
    if (!viceCaptainId) {
      toast({
        title: "Vice-Captain required",
        description: "Please select a vice-captain for your team (1.5x points).",
        variant: "destructive",
      });
      return;
    }
    
    setShowPreview(true);
  };
  
  const handleConfirmTeam = () => {
    if (captainId && viceCaptainId) {
      createTeamMutation.mutate({
        teamName: teamName.trim(),
        playerIds: selectedPlayers,
        captainId: captainId,
        viceCaptainId: viceCaptainId,
        wicketkeeper: "None",
        totalCredits: totalCredits
      });
    }
  };
  
  // Get player name by ID
  const getPlayerName = (id: number | null) => {
    if (!id) return "";
    return players.find(p => p.id === id)?.name || "";
  };
  
  // Get player category by ID
  const getPlayerCategory = (id: number | null) => {
    if (!id) return "";
    const player = players.find(p => p.id === id);
    if (!player) return "";
    return categories.find(c => c.id === player.categoryId)?.name || "";
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
          
          {/* Credits Counter */}
          <div className="bg-white shadow rounded-lg p-4 mb-6 flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg">Credit Points Used</h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-[#2ABDC0]">{totalCredits}</span>
                <span className="text-gray-500 ml-2">/ 1000</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="mb-1">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Captain: {getPlayerName(captainId) || "Not Selected"} (2x points)
                </Badge>
              </div>
              <div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Vice-Captain: {getPlayerName(viceCaptainId) || "Not Selected"} (1.5x points) 
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Team Creation Form */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h2 className="font-montserrat font-bold text-xl mb-4">Create Your Fantasy Team</h2>
              <p className="text-gray-600 mb-4">
                Select players for your team using a maximum of 1000 credit points. Choose a Captain (2x points) and 
                Vice-Captain (1.5x points) from your selected players.
              </p>
              
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
                        <div key={player.id} className="relative">
                          <PlayerCard
                            player={player}
                            category="All Rounder"
                            isSelected={selectedPlayers.includes(player.id)}
                            onToggle={() => handlePlayerToggle(player.id)}
                            color="#2ABDC0"
                          />
                          
                          {selectedPlayers.includes(player.id) && (
                            <div className="mt-2 flex justify-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setCaptainId(player.id)}
                                className={`flex items-center px-2 py-1 rounded-md text-xs ${
                                  captainId === player.id 
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                C
                              </button>
                              <button
                                type="button"
                                onClick={() => setViceCaptainId(player.id)}
                                className={`flex items-center px-2 py-1 rounded-md text-xs ${
                                  viceCaptainId === player.id 
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                VC
                              </button>
                            </div>
                          )}
                        </div>
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
                        <div key={player.id} className="relative">
                          <PlayerCard
                            player={player}
                            category="Batsman"
                            isSelected={selectedPlayers.includes(player.id)}
                            onToggle={() => handlePlayerToggle(player.id)}
                            color="#FF0066"
                          />
                          
                          {selectedPlayers.includes(player.id) && (
                            <div className="mt-2 flex justify-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setCaptainId(player.id)}
                                className={`flex items-center px-2 py-1 rounded-md text-xs ${
                                  captainId === player.id 
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                C
                              </button>
                              <button
                                type="button"
                                onClick={() => setViceCaptainId(player.id)}
                                className={`flex items-center px-2 py-1 rounded-md text-xs ${
                                  viceCaptainId === player.id 
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                VC
                              </button>
                            </div>
                          )}
                        </div>
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
                        <div key={player.id} className="relative">
                          <PlayerCard
                            player={player}
                            category="Bowler"
                            isSelected={selectedPlayers.includes(player.id)}
                            onToggle={() => handlePlayerToggle(player.id)}
                            color="#5A0001"
                          />
                          
                          {selectedPlayers.includes(player.id) && (
                            <div className="mt-2 flex justify-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setCaptainId(player.id)}
                                className={`flex items-center px-2 py-1 rounded-md text-xs ${
                                  captainId === player.id 
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                C
                              </button>
                              <button
                                type="button"
                                onClick={() => setViceCaptainId(player.id)}
                                className={`flex items-center px-2 py-1 rounded-md text-xs ${
                                  viceCaptainId === player.id 
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Award className="h-3 w-3 mr-1" />
                                VC
                              </button>
                            </div>
                          )}
                        </div>
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
                  type="button" 
                  className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90 py-6 h-auto"
                  onClick={handleSubmitPreview}
                  disabled={createTeamMutation.isPending}
                >
                  {createTeamMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Preview Team
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Team Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Team Preview</DialogTitle>
                <DialogDescription>
                  Review your team before confirming. Your Captain gets 2x points and Vice-Captain gets 1.5x points.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <h3 className="font-bold text-lg mb-2">{teamName}</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-gray-500 text-sm">Total Credits Used</span>
                      <div className="font-bold text-xl">{totalCredits} / 1000</div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Total Players</span>
                      <div className="font-bold text-xl">{selectedPlayers.length}</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <div className="bg-yellow-50 p-3 rounded-md flex-1">
                      <h4 className="text-sm text-yellow-800 mb-1">Captain (2x)</h4>
                      <div className="font-bold">{getPlayerName(captainId)}</div>
                      <div className="text-xs text-gray-500">{getPlayerCategory(captainId)}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-md flex-1">
                      <h4 className="text-sm text-blue-800 mb-1">Vice-Captain (1.5x)</h4>
                      <div className="font-bold">{getPlayerName(viceCaptainId)}</div>
                      <div className="text-xs text-gray-500">{getPlayerCategory(viceCaptainId)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Selected Players</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {selectedPlayerObjects.map((player) => player && (
                      <div 
                        key={player.id} 
                        className={`flex justify-between items-center p-2 rounded-md ${
                          captainId === player.id 
                            ? 'bg-yellow-50 border border-yellow-200' 
                            : viceCaptainId === player.id 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-500">{getPlayerCategory(player.id)}</div>
                          </div>
                          {captainId === player.id && (
                            <Badge className="ml-2 bg-yellow-500">C</Badge>
                          )}
                          {viceCaptainId === player.id && (
                            <Badge className="ml-2 bg-blue-500">VC</Badge>
                          )}
                        </div>
                        <div className="font-bold">{player.points} cr</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex-col space-y-2 sm:space-y-0">
                <div className="flex flex-col sm:flex-row gap-2 w-full justify-end">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Edit Team
                  </Button>
                  <Button 
                    className="bg-[#2ABDC0] hover:bg-[#2ABDC0]/90"
                    onClick={handleConfirmTeam}
                    disabled={createTeamMutation.isPending}
                  >
                    {createTeamMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save & Join Contest
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center sm:text-right">
                  After joining the contest, you'll be able to view your ranking and players' scores.
                </p>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
