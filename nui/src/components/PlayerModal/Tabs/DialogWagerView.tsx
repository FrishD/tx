import React, { useState } from "react";
import {
  Button,
  DialogContent,
  TextField,
  Typography,
} from "@mui/material";
import { useAssociatedPlayerValue } from "../../../state/playerDetails.state";
import { fetchWebPipe } from "../../../utils/fetchWebPipe";
import { useSnackbar } from "notistack";
import { useTranslate } from "react-polyglot";
import { usePlayerModalContext } from "../../../provider/PlayerModalProvider";
import { userHasPerm } from "../../../utils/miscUtils";
import { usePermissionsValue } from "../../../state/permissions.state";
import { GenericApiErrorResp, GenericApiResp } from "@shared/genericApiTypes";
import { useSetPlayerModalVisibility } from "@nui/src/state/playerModal.state";

const DialogWagerView: React.FC = () => {
  const assocPlayer = useAssociatedPlayerValue();
  const [reason, setReason] = useState("");
  const t = useTranslate();
  const setModalOpen = useSetPlayerModalVisibility();
  const { enqueueSnackbar } = useSnackbar();
  const { showNoPerms } = usePlayerModalContext();
  const playerPerms = usePermissionsValue();

  if (typeof assocPlayer !== "object") {
    return null;
  }

  const handleWagerBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userHasPerm("wager.staff", playerPerms))
      return showNoPerms("Wager Blacklist");

    const trimmedReason = reason.trim();
    if (!trimmedReason.length) {
      enqueueSnackbar(t("nui_menu.player_modal.wager.reason_required"), {
        variant: "error",
      });
      return;
    }

    fetchWebPipe<GenericApiResp>(
      `/player/wagerblacklist?mutex=current&netid=${assocPlayer.id}`,
      {
        method: "POST",
        data: {
          reason: trimmedReason,
        },
      }
    )
      .then((result) => {
        if ("success" in result && result.success) {
          setModalOpen(false);
          enqueueSnackbar(t(`nui_menu.player_modal.wager.success`), {
            variant: "success",
          });
        } else {
          enqueueSnackbar(
            (result as GenericApiErrorResp).error ??
              t("nui_menu.misc.unknown_error"),
            { variant: "error" }
          );
        }
      })
      .catch((error) => {
        enqueueSnackbar((error as Error).message, { variant: "error" });
      });
  };

  return (
    <DialogContent>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("nui_menu.player_modal.wager.title")}
      </Typography>
      <form onSubmit={handleWagerBlacklist}>
        <TextField
          id="reason"
          autoFocus
          fullWidth
          size="small"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helperText={t("nui_menu.player_modal.wager.helper_text")}
        />
        <Button
          variant="contained"
          type="submit"
          color="error"
          sx={{ mt: 2 }}
          onClick={handleWagerBlacklist}
        >
          {t("nui_menu.player_modal.wager.submit")}
        </Button>
      </form>
    </DialogContent>
  );
};

export default DialogWagerView;