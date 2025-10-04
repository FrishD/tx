import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import MuteForm, { MuteFormType } from "@/components/MuteForm";
import { txToast } from "@/components/TxToaster";


type PlayerMuteTabProps = {
    playerRef: PlayerModalRefType;
};

export default function PlayerMuteTab({ playerRef }: PlayerMuteTabProps) {
    const muteFormRef = useRef<MuteFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerMuteApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/mute`,
        throwGenericErrors: true,
    });

    if (!hasPerm('players.kick')) { // Using kick perm for now, can be changed
        return <ModalCentralMessage>
            You don't have permission to mute players.
        </ModalCentralMessage>;
    }

    const handleSave = () => {
        if (!muteFormRef.current) return;
        const { reason, duration } = muteFormRef.current.getData();

        if (!reason || reason.length < 3) {
            txToast.warning(`The reason must be at least 3 characters long.`);
            muteFormRef.current.focusReason();
            return;
        }

        setIsSaving(true);
        playerMuteApi({
            queryParams: playerRef,
            data: {reason, duration},
            toastLoadingMessage: 'Muting player...',
            genericHandler: {
                successMsg: 'Player muted.',
            },
            success: (data) => {
                setIsSaving(false);
                closeModal();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    return (
        <div className="grid gap-4 p-1">
            <MuteForm
                ref={muteFormRef}
                disabled={isSaving}
                onNavigateAway={() => { closeModal(); }}
            />
            <div className="flex place-content-end">
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Muting...
                        </span>
                    ) : 'Apply Mute'}
                </Button>
            </div>
        </div>
    );
}