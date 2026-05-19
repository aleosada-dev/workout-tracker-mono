import { Icon } from '@workout-tracker/ui-mobile';
import { LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { supabase } from '@/features/shared/lib/supabase';

export default function SignOut() {
  const { t } = useTranslation();
  const onSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Toast.show({
        type: 'error',
        text1: t('settings.signOutError'),
        text2: error.message,
      });
    }
  };

  return <Icon onPress={onSignOut} as={LogOut} size={28} className="text-foreground" />;
}
