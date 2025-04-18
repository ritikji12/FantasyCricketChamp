import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface LeaderboardProps {
  leaderboard: Array<{
    teamId: number;
    teamName: string;
    userName: string;
    totalPoints: number;
  }>;
  currentTeamId: number;
}

export default function Leaderboard({ leaderboard, currentTeamId }: LeaderboardProps) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <h3 className="font-montserrat font-bold text-lg mb-4">Leaderboard</h3>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.teamId} 
              className={`flex justify-between items-center p-3 rounded-md ${
                entry.teamId === currentTeamId ? 'bg-[#2ABDC0]/5' : ''
              }`}
            >
              <div className="flex items-center">
                <span className="font-bold w-6 text-center">{index + 1}</span>
                <span className="ml-3">{entry.teamName}</span>
              </div>
              <div className="text-[#FFBA08] font-bold">{entry.totalPoints} pts</div>
            </div>
          ))}
          
          {leaderboard.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              No teams in the leaderboard yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
