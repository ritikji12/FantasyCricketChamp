import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';

export default function MatchBanner() {
  // Fetch live match
  const { data: matches, isLoading } = useQuery({
    queryKey: ['/api/matches/live'],
  });
  
  // Get the first live match
  const match = Array.isArray(matches) && matches.length > 0 ? matches[0] : null;

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <h2 className="font-montserrat font-bold text-2xl text-center md:text-left mb-4 md:mb-0">
            {isLoading ? (
              <span className="text-gray-400">Loading match...</span>
            ) : match ? (
              <>
                <span className="text-[#5A0001]">{match.team1}</span> 
                <span className="text-gray-500 mx-2">vs</span> 
                <span className="text-[#2ABDC0]">{match.team2}</span>
              </>
            ) : (
              <span className="text-gray-400">No live match found</span>
            )}
          </h2>
          <div className="flex items-center">
            <div className="bg-[#FFBA08]/10 text-[#FFBA08] py-2 px-4 rounded-md flex items-center">
              <svg 
                className="mr-2 h-4 w-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span className="font-medium">Contest Live</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
