import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook for tracking user activity
 * Updates last_active timestamp with:
 * 1. Periodic heartbeat (every 10 minutes)
 * 2. Manual updates on user actions
 */
export const useActivityTracker = (userId: string | null | undefined) => {
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
    const MIN_UPDATE_INTERVAL = 60 * 1000; // Minimum 1 minute between updates

    /**
     * Update last_active timestamp in database
     * Debounced to prevent excessive updates
     */
    const updateActivity = async () => {
        if (!userId) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;

        // Skip if updated recently (within 1 minute)
        if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ last_active: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                console.warn('Failed to update last_active:', error.message);
            } else {
                lastUpdateRef.current = now;
            }
        } catch (err) {
            console.warn('Exception in updateActivity:', err);
        }
    };

    /**
     * Start heartbeat timer
     */
    const startHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
            updateActivity();
        }, HEARTBEAT_INTERVAL);
    };

    /**
     * Stop heartbeat timer
     */
    const stopHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    };

    // Setup heartbeat on mount, cleanup on unmount
    useEffect(() => {
        if (userId) {
            startHeartbeat();
        }

        return () => {
            stopHeartbeat();
        };
    }, [userId]);

    // Return manual update function for user actions
    return {
        trackActivity: updateActivity,
    };
};
