import { Alert } from 'react-native';

export function confirmDeleteAccount(onConfirm) {
  Alert.alert(
    'Delete your account?',
    'This permanently deletes your cloud account, links with other users, and synced session data. Local data on this device is removed too. You cannot undo this.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete account permanently?',
            'This is your last chance to cancel. You will need to sign in again to use the app.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete my account',
                style: 'destructive',
                onPress: onConfirm,
              },
            ],
          );
        },
      },
    ],
  );
}
