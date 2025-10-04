import React from 'react';
import { Dialog, DialogContent, DialogTitle, Typography, Box } from '@mui/material';
import { MicOff } from '@mui/icons-material';
import { useMuteNotifState } from '../state/muteNotif.state';
import { useTranslate } from 'react-polyglot';

export const MuteNotification: React.FC = () => {
  const [notifState, setNotifState] = useMuteNotifState();
  const t = useTranslate();

  const handleClose = () => {
    setNotifState({ ...notifState, open: false });
  };

  // Auto-close after 10 seconds
  React.useEffect(() => {
    if (notifState.open) {
      const timer = setTimeout(() => {
        handleClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [notifState.open]);

  return (
    <Dialog open={notifState.open} onClose={handleClose} maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'error.main', color: 'white' }}>
        <MicOff />
        {t('nui_menu.mute_notif.title')}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('nui_menu.mute_notif.muted_by_admin')}
        </Typography>
        {notifState.reason && (
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{t('nui_menu.mute_notif.reason')}</Typography>
            <Typography variant="body2" sx={{ ml: 1 }}>{notifState.reason}</Typography>
          </Box>
        )}
        {notifState.duration && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{t('nui_menu.mute_notif.duration')}</Typography>
            <Typography variant="body2" sx={{ ml: 1 }}>{notifState.duration}</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};