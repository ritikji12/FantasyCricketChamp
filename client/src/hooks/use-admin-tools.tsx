import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useAdminTools() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Mutation to set player credit points
  const setPlayerCreditsMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const res = await apiRequest('POST', '/api/admin/set-player-credits');
      return await res.json();
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: 'Success',
        description: 'Player credit points have been set successfully',
        variant: 'default',
      });
      
      // Invalidate players cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast({
        title: 'Failed to set player credit points',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    isLoading,
    setPlayerCredits: () => setPlayerCreditsMutation.mutate(),
  };
}
