import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function WorkoutsLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="exercisesList" options={{ title: t('exerciseListScreen.title') }} />
      <Stack.Screen
        name="exercisesFilter"
        options={{ title: t('exerciseListScreen.filter.title'), presentation: 'formSheet' }}
      />
      <Stack.Screen name="exerciseDetail" />
      <Stack.Screen
        name="addExercise"
        options={{ title: 'Adicionar exercício', presentation: 'modal' }}
      />
      <Stack.Screen name="workoutsList" />
      <Stack.Screen name="cardioList" />
      <Stack.Screen name="myPeriodization" />
    </Stack>
  );
}
