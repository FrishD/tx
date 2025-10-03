import { useSetIsMenuVisible } from "../state/visibility.state";
import { txAdminMenuPage, useSetPage } from "../state/page.state";
import { useNuiEvent } from "./useNuiEvent";
import {
  ResolvablePermission,
  useSetPermissions,
} from "../state/permissions.state";

import {
  ServerCtx,
  useSetServerCtx,
} from "../state/server.state";
import { useSetMuteNotifState } from "../state/muteNotif.state";

// Passive Message Event Listeners & Handlers for global state
export const useNuiListenerService = () => {
  const setVisible = useSetIsMenuVisible();
  const setMenuPage = useSetPage();
  const setPermsState = useSetPermissions();
  const setServerCtxState = useSetServerCtx();
  const setMuteNotif = useSetMuteNotifState();

  useNuiEvent<{ reason: string; duration: string }>(
    "showMuteNotification",
    (data) => {
      setMuteNotif({
        open: true,
        reason: data.reason,
        duration: data.duration,
      });
    }
  );

  useNuiEvent<boolean>("setDebugMode", (debugMode) => {
    (window as any).__MenuDebugMode = debugMode;
  });
  useNuiEvent<boolean>("setVisible", setVisible);
  useNuiEvent<ResolvablePermission[]>("setPermissions", setPermsState);
  useNuiEvent<ServerCtx>("setServerCtx", setServerCtxState);
  useNuiEvent<txAdminMenuPage>("setMenuPage", setMenuPage);
};
