import { Text } from '@workout-tracker/ui-mobile';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { exerciseObservability } from '@/features/observability/lib';
import { validatePickedVideo } from '../lib/video-validation';

type SelectedVideo = {
  uri: string;
  fileName: string | null;
};

/**
 * Seleção do vídeo de demonstração a partir da galeria do dispositivo.
 *
 * Por enquanto o vídeo só vive no estado local desta tela: o endpoint de criar
 * exercício ainda não aceita upload, então enviá-lo ao backend é uma etapa
 * futura. Aqui cuidamos apenas de escolher, validar (tamanho e duração) e
 * pré-visualizar.
 */
export function ExerciseVideoPicker() {
  const { t } = useTranslation();
  const [video, setVideo] = useState<SelectedVideo | null>(null);

  async function handlePick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      const validation = validatePickedVideo({
        fileSize: asset.fileSize,
        durationMs: asset.duration,
      });
      if (!validation.ok) {
        exerciseObservability.trackAction('exercise_video_rejected', { reason: validation.reason });
        Toast.show({
          type: 'error',
          text1: t(`exerciseListScreen.addExercise.video.errors.${validation.reason}.title`),
          text2: t(`exerciseListScreen.addExercise.video.errors.${validation.reason}.message`),
        });
        return;
      }

      setVideo({ uri: asset.uri, fileName: asset.fileName ?? null });
      exerciseObservability.trackAction('exercise_video_selected');
    } catch (error) {
      exerciseObservability.captureError(error, { action: 'pick_exercise_video' });
      Toast.show({
        type: 'error',
        text1: t('errors.unexpected.title'),
        text2: t('errors.unexpected.message'),
      });
    }
  }

  return (
    <View className="gap-2">
      <Text className="font-sans-semibold">{t('exerciseListScreen.addExercise.video.label')}</Text>

      {video ? (
        <SelectedVideoPreview video={video} onRemove={() => setVideo(null)} />
      ) : (
        <>
          <Text variant="muted">{t('exerciseListScreen.addExercise.video.hint')}</Text>
          <Pressable
            onPress={handlePick}
            accessibilityRole="button"
            accessibilityLabel={t('exerciseListScreen.addExercise.video.select')}
            testID="add-exercise.video.select"
            className="mt-1 flex-row items-center justify-center gap-2 rounded-md border border-border border-dashed bg-muted/40 px-4 py-6 active:opacity-70"
          >
            <Upload size={18} color="#a1a1aa" />
            <Text variant="muted">{t('exerciseListScreen.addExercise.video.select')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function SelectedVideoPreview({ video, onRemove }: { video: SelectedVideo; onRemove: () => void }) {
  const { t } = useTranslation();
  const player = useVideoPlayer(video.uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  return (
    <View className="gap-2" testID="add-exercise.video.preview">
      <View className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls
        />
      </View>
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="muted" numberOfLines={1} className="flex-1">
          {video.fileName ?? t('exerciseListScreen.addExercise.video.selected')}
        </Text>
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('exerciseListScreen.addExercise.video.remove')}
          testID="add-exercise.video.remove"
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <X size={16} color="#a1a1aa" />
          <Text variant="muted">{t('exerciseListScreen.addExercise.video.remove')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
