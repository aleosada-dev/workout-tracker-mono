import { useState } from 'react';
import { View } from 'react-native';
import { ExerciseVideoCard } from './ExerciseVideoCard';
import { ExerciseYouTubeCard } from './ExerciseYouTubeCard';
import { type VideoSource, VideoSourceToggle } from './VideoSourceToggle';

export type ExerciseDemoVideoProps = {
  uploadedUrl: string | null;
  youtubeUrl: string | null;
};

/** Demonstration video for the exercise. Picks between the uploaded MP4 and the
 *  YouTube embed, and renders a source toggle when both are available. */
export function ExerciseDemoVideo({ uploadedUrl, youtubeUrl }: ExerciseDemoVideoProps) {
  const [source, setSource] = useState<VideoSource>(uploadedUrl ? 'uploaded' : 'youtube');
  const hasBoth = !!uploadedUrl && !!youtubeUrl;

  if (!uploadedUrl && !youtubeUrl) return null;

  return (
    <View className="gap-2" testID="exercise-detail.video">
      {hasBoth ? <VideoSourceToggle source={source} onChange={setSource} /> : null}
      {source === 'uploaded' && uploadedUrl ? <ExerciseVideoCard uri={uploadedUrl} /> : null}
      {source === 'youtube' && youtubeUrl ? <ExerciseYouTubeCard url={youtubeUrl} /> : null}
    </View>
  );
}
