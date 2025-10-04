import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPerms } from "@/hooks/auth";
import { useBackendApi } from "@/hooks/fetch";
import { PlayerModalRefType } from "@/hooks/playerModal";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { PlayerModalPlayerData } from "@shared/playerApiTypes";
import { useState } from "react";

type PlayerMuteTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
}

export default function PlayerMuteTab({ playerRef, player, refreshModalData }: PlayerMuteTabProps) {
    const { hasPerm } = useAdminPerms();
    const [duration, setDuration] = useState('');
    const [reason, setReason] = useState('');
    const playerMuteApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/actions/mute`,
    });

    const handleMuteClick = () => {
        playerMuteApi({
            queryParams: playerRef,
            data: {
                duration: duration,
                reason: reason,
            },
            toastLoadingMessage: 'Muting player...',
            genericHandler: {
                successMsg: 'Player muted.',
            },
            success: (data, toastId) => {
                if ('success' in data) {
                    refreshModalData();
                }
            },
        });
    }

    const handleUnmuteClick = () => {
        playerMuteApi({
            queryParams: playerRef,
            data: {
                duration: 0,
                reason: 'unmuted',
            },
            toastLoadingMessage: 'Unmuting player...',
            genericHandler: {
                successMsg: 'Player unmuted.',
            },
            success: (data, toastId) => {
                if ('success' in data) {
                    refreshModalData();
                }
            },
        });
    }

    const isMuted = player.actionHistory.some(a => a.type === 'mute' && !a.revokedAt);

    if (!hasPerm('players.mute')) {
        return <div className="p-4">You don't have permission to mute players.</div>;
    }

    if (isMuted) {
        return (
            <div className="p-4">
                <p className="mb-4">This player is currently muted.</p>
                <Button variant="destructive" onClick={handleUnmuteClick}>Unmute</Button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div>
                <Label htmlFor="duration">Duration (in minutes, 0 for permanent)</Label>
                <Input
                    id="duration"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 60 for 1 hour"
                />
            </div>
            <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for muting..."
                />
            </div>
            <Button onClick={handleMuteClick}>Mute Player</Button>
        </div>
    );
}