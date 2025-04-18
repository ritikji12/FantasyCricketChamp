import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface PlayerCardProps {
  player: {
    id: number;
    name: string;
    points: number;
    runs?: number;
    wickets?: number;
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
        <div className="flex items-center">
          <span className="text-[#FFBA08] font-bold">{player.points} pts</span>
        </div>
      </CardContent>
    </Card>
  );
}
