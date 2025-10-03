import { atom, useRecoilState, useSetRecoilState } from "recoil";

export interface MuteNotifState {
  open: boolean;
  reason?: string;
  duration?: string;
}

const muteNotifAtom = atom<MuteNotifState>({
  key: "muteNotifState",
  default: {
    open: false,
  },
});

export const useMuteNotifState = () => useRecoilState(muteNotifAtom);
export const useSetMuteNotifState = () => useSetRecoilState(muteNotifAtom);