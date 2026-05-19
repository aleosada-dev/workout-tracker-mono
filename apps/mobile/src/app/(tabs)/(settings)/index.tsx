import { Text } from '@workout-tracker/ui-mobile';
import { useRouter } from 'expo-router';
import { Bell, CreditCard, Languages, Palette, ShieldCheck, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { MenuCard } from '@/shared/components/MenuCard';

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
        <MenuCard onPress={() => router.push('/appearance')}>
          <Palette color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.appearance')}
          </Text>
        </MenuCard>
      </View>
      <View className="flex-row gap-4">
        <MenuCard onPress={() => router.push('/local')}>
          <Languages color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.local')}
          </Text>
        </MenuCard>
        <MenuCard onPress={() => router.push('/notifications')}>
          <Bell color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.notifications')}
          </Text>
        </MenuCard>
      </View>
      <View className="flex-row gap-4">
        <MenuCard onPress={() => router.push('/privacy')}>
          <ShieldCheck color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.privacy')}
          </Text>
        </MenuCard>
        <MenuCard onPress={() => router.push('/subscription')}>
          <CreditCard color="white" size={36} />
          <Text variant="h4" className="text-center text-white">
            {t('settings.subscription')}
          </Text>
        </MenuCard>
      </View>
    </ScrollView>
  );
}
