import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import { Textarea } from "@/components/ui/textarea";
import { txToast } from "@/components/TxToaster";
import { PlayerModalPlayerData } from "@shared/playerApiTypes";


type PlayerFlagTabProps = {
    playerRef: PlayerModalRefType;
    player: PlayerModalPlayerData;
    refreshModalData: () => void;
};

export default function PlayerFlagTab({ playerRef, player, refreshModalData }: PlayerFlagTabProps) {
    const reasonRef = useRef<HTMLTextAreaElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerFlagApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/actions/flag`,
        throwGenericErrors: true,
    });

    const isFlagged = player.actionHistory.some(a => a.type === 'flag' && !a.revokedAt);

    if (!hasPerm('players.ban')) { // Using ban perm for now
        return <ModalCentralMessage>
            You don't have permission to flag players.
        </ModalCentralMessage>;
    }

    const handleAdd = () => {
        if (!reasonRef.current) return;
        const reason = reasonRef.current.value;

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            reasonRef.current.focus();
            return;
        }

        setIsSaving(true);
        playerFlagApi({
            queryParams: playerRef,
            data: { reason, revoke: false },
            toastLoadingMessage: 'Flagging Player...',
            genericHandler: {
                successMsg: 'Player Flagged.',
            },
            success: (data) => {
                setIsSaving(false);
                refreshModalData();
                closeModal();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    const handleRevoke = () => {
        if (!reasonRef.current) return;
        const reason = reasonRef.current.value;

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            reasonRef.current.focus();
            return;
        }

        setIsSaving(true);
        playerFlagApi({
            queryParams: playerRef,
            data: { reason, revoke: true },
            toastLoadingMessage: 'Unflagging Player...',
            genericHandler: {
                successMsg: 'Player Unflagged.',
            },
            success: (data) => {
                setIsSaving(false);
                refreshModalData();
                closeModal();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    }

    if (isFlagged) {
        return (
            <div className="grid gap-4 p-1">
                <p className="text-sm text-muted-foreground">This player is currently flagged.</p>
                <Textarea
                    ref={reasonRef}
                    placeholder="Reason for unflagging..."
                    className="h-24"
                    disabled={isSaving}
                />
                <div className="flex place-content-end">
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={isSaving}
                        onClick={handleRevoke}
                    >
                        {isSaving ? (
                            <span className="flex items-center leading-relaxed">
                                <Loader2Icon className="inline animate-spin h-4" /> Unflagging...
                            </span>
                        ) : 'Remove Flag'}
                    </Button>
                </div>
            </div>
        );
    }


    return (
        <div className="grid gap-4 p-1">
            <Textarea
                ref={reasonRef}
                placeholder="Reason for flagging..."
                className="h-24"
                disabled={isSaving}
            />
            <div className="flex place-content-end">
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleAdd}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Flagging...
                        </span>
                    ) : 'Add Flag'}
                </Button>
            </div>
        </div>
    );
}