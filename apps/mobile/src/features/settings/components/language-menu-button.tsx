import { useValue } from '@legendapp/state/react';
import {
  Icon,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Text,
} from '@workout-tracker/ui-mobile';
import { Check, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { resolveLanguage } from '@/features/settings/state/language-bridge';
import { language$, setLanguage } from '@/features/settings/state/settings-store';
import { useLanguageOptions } from '@/features/settings/state/use-language-options';

export function LanguageMenuButton() {
  const { t } = useTranslation();
  const current = useValue(language$);
  const options = useLanguageOptions();
  const initials = resolveLanguage(current).toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.languageLabel')}
          hitSlop={8}
          className="h-10 flex-row items-center gap-2 rounded-full px-3"
        >
          <Text className="font-sand-medium text-foreground text-sm">{initials}</Text>
          <Icon as={Globe} size={22} className="text-foreground" />
        </Pressable>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {options.map((opt) => {
          const active = current === opt.value;
          return (
            <PopoverClose key={opt.value} asChild>
              <Pressable
                onPress={() => setLanguage(opt.value)}
                className="flex-row items-center justify-between rounded-sm px-3 py-2 active:bg-accent"
              >
                <Text className="text-foreground text-sm">{opt.label}</Text>
                {active && (
                  <View>
                    <Icon as={Check} size={16} className="text-foreground" />
                  </View>
                )}
              </Pressable>
            </PopoverClose>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
