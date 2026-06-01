import { Text } from '@workout-tracker/ui-mobile';
import { useRouter } from 'expo-router';
import { Bell, CreditCard, ShieldCheck, SlidersHorizontal, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { MenuCard } from '@/features/shared/components/MenuCard';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
      <View className="flex-row gap-4">
        <MenuCard onPress={() => router.push('/profile')}>
          <User color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.profile')}
          </Text>
        </MenuCard>
        <MenuCard onPress={() => router.push('/preferences')}>
          <SlidersHorizontal color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.preferences')}
          </Text>
        </MenuCard>
      </View>
      <View className="flex-row gap-4">
        <MenuCard onPress={() => router.push('/notifications')}>
          <Bell color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.notifications')}
          </Text>
        </MenuCard>
        <MenuCard onPress={() => router.push('/privacy')}>
          <ShieldCheck color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.privacy')}
          </Text>
        </MenuCard>
      </View>
      <View className="flex-row gap-4">
        <MenuCard onPress={() => router.push('/subscription')}>
          <CreditCard color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.subscription')}
          </Text>
        </MenuCard>
        <View className="flex-1" />
      </View>
    </ScrollView>
  );
}
