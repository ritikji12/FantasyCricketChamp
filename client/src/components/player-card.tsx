import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface PlayerCardProps {
  player: {
    id: number;
    name: string;
    points?: number;
    creditPoints?: number;
    runs?: number;
    wickets?: number;
    selectionPercentage?: number;
    selectionPercent?: number;
  };
  category: string;
  isSelected: boolean;
  onToggle: () => void;
  color?: string;
}

export default function PlayerCard({ player, category, isSelected, onToggle, color = "#2ABDC0" }: PlayerCardProps) {
  return (
    <Card className={`hover:shadow-md transition relative border-gray-200 ${isSelected ? `border-2 border-${color}` : ''}`}>
      <CardContent className="p-4">
        <div className="absolute top-3 right-3">
          <Checkbox 
            id={`player-${player.id}`}
            checked={isSelected}
            onCheckedChange={onToggle}
            className={`text-[${color}] focus:ring-[${color}]`}
          />
        </div>
        <h4 className="font-medium text-gray-800 mb-1">{player.name}</h4>
        <p className="text-sm text-gray-500 mb-2">{category}</p>
        <div className="flex items-center justify-between">
          <span className="text-[#FFBA08] font-bold">{player.creditPoints || player.points || 0} pts</span>
          {(player.selectionPercentage !== undefined || player.selectionPercent !== undefined) && (
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-1.5">
                <div 
                  className="bg-green-500 h-1.5 rounded-full" 
                  style={{ 
                    width: `${player.selectionPercentage || player.selectionPercent || 0}%`,
                    backgroundColor: (player.selectionPercentage || player.selectionPercent || 0) > 70 ? '#FF0066' : 
                                     (player.selectionPercentage || player.selectionPercent || 0) > 40 ? '#FFBA08' : 
                                     '#10B981'
                  }} 
                ></div>
              </div>
              <span className="text-xs font-semibold" style={{ 
                color: (player.selectionPercentage || player.selectionPercent || 0) > 70 ? '#FF0066' : 
                       (player.selectionPercentage || player.selectionPercent || 0) > 40 ? '#FFBA08' : 
                       '#10B981'
              }}>
                {player.selectionPercentage || player.selectionPercent || 0}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
