import { useMemo, useState } from 'react';
import { AppConfirmDialog, AppDialogAction } from '../components/ui/app-confirm-dialog';

type DialogConfig = {
  title: string;
  message: string;
  actions: AppDialogAction[];
};

export const useAppDialog = () => {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const closeDialog = () => setDialog(null);

  const showDialog = (title: string, message: string, actions: AppDialogAction[]) => {
    const wrappedActions = actions.map((action) => ({
      ...action,
      onPress: () => {
        closeDialog();
        action.onPress?.();
      },
    }));

    setDialog({
      title,
      message,
      actions: wrappedActions,
    });
  };

  const dialogElement = useMemo(() => {
    if (!dialog) return null;

    return (
      <AppConfirmDialog
        visible={!!dialog}
        title={dialog.title}
        message={dialog.message}
        actions={dialog.actions}
        onClose={closeDialog}
      />
    );
  }, [dialog]);

  return {
    showDialog,
    closeDialog,
    dialogElement,
  };
};
