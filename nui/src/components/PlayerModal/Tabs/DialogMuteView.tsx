import React, { useState } from "react";
import {
  Box,
  Button,
  DialogContent,
  MenuItem,
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

const DialogMuteView: React.FC = () => {
  const assocPlayer = useAssociatedPlayerValue();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("2 hours");
  const [customDuration, setCustomDuration] = useState("hours");
  const [customDurLength, setCustomDurLength] = useState("1");
  const t = useTranslate();
  const setModalOpen = useSetPlayerModalVisibility();
  const { enqueueSnackbar } = useSnackbar();
  const { showNoPerms } = usePlayerModalContext();
  const playerPerms = usePermissionsValue();

  if (typeof assocPlayer !== "object") {
    return null;
  }

  const handleMute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userHasPerm("players.mute", playerPerms)) return showNoPerms("Mute");

    const trimmedReason = reason.trim();
    if (!trimmedReason.length) {
      enqueueSnackbar(t("nui_menu.player_modal.mute.reason_required"), {
        variant: "error",
      });
      return;
    }

    const actualDuration =
      duration === "custom"
        ? `${customDurLength} ${customDuration}`
        : duration;

    fetchWebPipe<GenericApiResp>(
      `/player/mute?mutex=current&netid=${assocPlayer.id}`,
      {
        method: "POST",
        data: {
          reason: trimmedReason,
          duration: actualDuration,
        },
      }
    )
      .then((result) => {
        if ("success" in result && result.success) {
          setModalOpen(false);
          enqueueSnackbar(t(`nui_menu.player_modal.mute.success`), {
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

  const muteDurations = [
    {
      value: "2 hours",
      label: `2 ${t("nui_menu.player_modal.ban.hours")}`,
    },
    {
      value: "8 hours",
      label: `8 ${t("nui_menu.player_modal.ban.hours")}`,
    },
    {
      value: "1 day",
      label: `1 ${t("nui_menu.player_modal.ban.days")}`,
    },
    {
      value: "2 days",
      label: `2 ${t("nui_menu.player_modal.ban.days")}`,
    },
    {
      value: "1 week",
      label: `1 ${t("nui_menu.player_modal.ban.weeks")}`,
    },
    {
      value: "2 weeks",
      label: `2 ${t("nui_menu.player_modal.ban.weeks")}`,
    },
    {
      value: "permanent",
      label: t("nui_menu.player_modal.ban.permanent"),
    },
    {
      value: "custom",
      label: t("nui_menu.player_modal.ban.custom"),
    },
  ];

  const customMuteLength = [
    {
      value: "hours",
      label: t("nui_menu.player_modal.ban.hours"),
    },
    {
      value: "days",
      label: t("nui_menu.player_modal.ban.days"),
    },
    {
      value: "weeks",
      label: t("nui_menu.player_modal.ban.weeks"),
    },
    {
      value: "months",
      label: t("nui_menu.player_modal.ban.months"),
    },
  ];

  return (
    <DialogContent>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("nui_menu.player_modal.mute.title")}
      </Typography>
      <form onSubmit={handleMute}>
        <TextField
          id="reason"
          autoFocus
          fullWidth
          size="small"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <TextField
          size="small"
          select
          required
          sx={{ mt: 2 }}
          label={t("nui_menu.player_modal.ban.duration_placeholder")}
          variant="outlined"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          helperText={t("nui_menu.player_modal.mute.helper_text")}
          fullWidth
        >
          {muteDurations.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {duration === "custom" && (
          <Box display="flex" alignItems="stretch" gap={1} sx={{ mt: 2 }}>
            <TextField
              type="number"
              placeholder="1"
              variant="outlined"
              size="small"
              value={customDurLength}
              onChange={(e) => setCustomDurLength(e.target.value)}
            />
            <TextField
              select
              variant="outlined"
              size="small"
              fullWidth
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
            >
              {customMuteLength.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}
        <Button
          variant="contained"
          type="submit"
          color="error"
          sx={{ mt: 2 }}
          onClick={handleMute}
        >
          {t("nui_menu.player_modal.mute.submit")}
        </Button>
      </form>
    </DialogContent>
  );
};

export default DialogMuteView;