import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TeamStatsProps {
  teamData: {
    team: {
      id: number;
      name: string;
    };
    players: Array<{
      id: number;
      name: string;
      categoryId: number;
      points: number;
    }>;
    totalPoints: number;
    rank: number;
  };
}

export default function TeamStats({ teamData }: TeamStatsProps) {
  const { team, players, totalPoints, rank } = teamData;
  
  // Group players by category
  const getPlayerCategoryName = (categoryId: number) => {
    // Map category IDs to names
    const categoryMap: Record<number, string> = {
      1: "All Rounder",
      2: "Batsman",
      3: "Bowler",
      4: "Wicketkeeper"
    };
    return categoryMap[categoryId] || "Unknown";
  };

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-montserrat font-bold text-xl">
            Your Team: <span className="text-[#2ABDC0]">{team.name}</span>
          </h2>
          <Badge className="bg-[#FFBA08]/10 text-[#FFBA08] py-1 px-3 rounded-md text-sm font-medium hover:bg-[#FFBA08]/10">
            Rank: {rank} of 10 {/* This would normally come from the API */}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md mb-4">
          <div>
            <span className="text-gray-600 text-sm">Total Points</span>
            <div className="text-3xl font-bold text-[#5A0001]">{totalPoints} pts</div>
          </div>
          <div className="text-right">
            <span className="text-gray-600 text-sm">Points Behind Leader</span>
            <div className="text-xl font-medium text-[#FF0066]">
              {/* Calculate points behind leader */}
              {rank === 1 ? (
                <span className="text-green-600">Leading</span>
              ) : (
                `-50 pts` /* This would come from API */
              )}
            </div>
          </div>
        </div>
        
        <h3 className="font-montserrat font-medium text-lg mb-3">Your Selected Players</h3>
        <div className="space-y-3">
          {players.map(player => (
            <div key={player.id} className="flex justify-between items-center p-3 border-b border-gray-100">
              <div>
                <span className="font-medium">{player.name}</span>
                <span className="text-sm text-gray-500 ml-2">{getPlayerCategoryName(player.categoryId)}</span>
              </div>
              <div className="text-[#FFBA08] font-bold">{player.points} pts</div>
            </div>
          ))}
          
          {players.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No players selected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
