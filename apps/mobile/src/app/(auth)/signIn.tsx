import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardContent, Icon, Input, Label, Text } from '@workout-tracker/ui-mobile';
import { Link } from 'expo-router';
import { Dumbbell, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { signInErrorMessageKey } from '@/features/auth/lib/auth-error';
import { LanguageMenuButton } from '@/features/settings/components/language-menu-button';
import { ThemeToggle } from '@/features/settings/components/theme-toggle';
import { supabase } from '@/features/shared/lib/supabase';

const signInSchema = z.object({
  email: z.email('signInScreen.validation.emailInvalid'),
  password: z.string().nonempty('signInScreen.validation.passwordRequired'),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const { progress } = useReanimatedKeyboardAnimation();

  const headerStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const headerAnimatedProps = useAnimatedProps(() => ({
    pointerEvents: (progress.value > 0.5 ? 'none' : 'auto') as 'none' | 'auto',
  }));

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = async ({ email, password }: SignInForm) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Toast.show({
        type: 'error',
        text1: t('signInScreen.errors.signInError'),
        text2: t(signInErrorMessageKey(error)),
      });
    }
  };

  return (
    <View className="flex-1">
      <Animated.View
        animatedProps={headerAnimatedProps}
        style={[{ paddingTop: insets.top + 8 }, headerStyle]}
        className="absolute right-4 z-10 flex-row items-center gap-2"
      >
        <ThemeToggle showSystemOption={false} showOptionLabels={false} fullWidth={false} />
        <LanguageMenuButton />
      </Animated.View>
      <KeyboardAwareScrollView
        testID="signIn.screen"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 24 + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <Icon as={Dumbbell} size={40} className="text-primary-foreground" />
          </View>
          <Text variant="h2" className="mt-6 border-b-0 pb-0 text-foreground">
            {t('signInScreen.welcome')}
          </Text>
          <Text variant="muted" className="mt-2">
            {t('signInScreen.subtitle')}
          </Text>
        </View>

        <Card className="mt-10">
          <CardContent className="gap-4">
            <View className="gap-2">
              <Label nativeID="email" invalid={!!errors.email}>
                {t('signInScreen.emailLabel')}
              </Label>
              <View className="relative justify-center">
                <Icon as={Mail} size={18} className="absolute left-3 z-10 text-muted-foreground" />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      testID="signIn.emailInput"
                      aria-labelledby="email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      aria-invalid={!!errors.email}
                      editable={!isSubmitting}
                      className="h-12 pl-10"
                    />
                  )}
                />
              </View>
              {errors.email?.message && (
                <Text className="text-destructive text-sm">{t(errors.email.message)}</Text>
              )}
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Label nativeID="password" invalid={!!errors.password}>
                  {t('signInScreen.passwordLabel')}
                </Label>
                <Link href="/signIn" asChild>
                  <Pressable testID="signIn.forgotPasswordLink" disabled={isSubmitting}>
                    <Text className="text-foreground text-sm">
                      {t('signInScreen.forgotPassword')}
                    </Text>
                  </Pressable>
                </Link>
              </View>
              <View className="relative justify-center">
                <Icon as={Lock} size={18} className="absolute left-3 z-10 text-muted-foreground" />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      testID="signIn.passwordInput"
                      aria-labelledby="password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      aria-invalid={!!errors.password}
                      editable={!isSubmitting}
                      className="h-12 px-10"
                    />
                  )}
                />
                <Pressable
                  testID="signIn.togglePasswordVisibility"
                  onPress={() => setShowPassword((v) => !v)}
                  disabled={isSubmitting}
                  className="absolute right-3 z-10"
                >
                  <Icon
                    as={showPassword ? Eye : EyeOff}
                    size={18}
                    className="text-muted-foreground"
                  />
                </Pressable>
              </View>
              {errors.password?.message && (
                <Text className="text-destructive text-sm">{t(errors.password.message)}</Text>
              )}
            </View>

            <Button
              testID="signIn.submitButton"
              size="lg"
              className="mt-2 rounded-full"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            >
              <Text>{isSubmitting ? t('signInScreen.submitting') : t('signInScreen.submit')}</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="mt-8 flex-row items-center justify-center gap-2">
          <Text variant="muted">{t('signInScreen.noAccount')}</Text>
          <Link href="/signIn" asChild>
            <Pressable testID="signIn.signUpLink" disabled={isSubmitting}>
              <Text className="font-sand-medium text-primary text-sm">
                {t('signInScreen.signUp')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
