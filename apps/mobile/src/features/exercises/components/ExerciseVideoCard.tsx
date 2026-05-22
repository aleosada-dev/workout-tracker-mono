import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

export type ExerciseVideoCardProps = {
  uri: string;
};

/** Demonstration video for an exercise, shown above the detail content. */
export function ExerciseVideoCard({ uri }: ExerciseVideoCardProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  return (
    <View
      className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black"
      testID="exercise-detail.video"
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}
