import { useWindowDimensions, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { extractYouTubeVideoId } from '@/shared/lib/youtube';

const SCROLL_HORIZONTAL_PADDING = 32;

export type ExerciseYouTubeCardProps = {
  url: string;
};

/** YouTube demonstration video embedded via the IFrame Player API. */
export function ExerciseYouTubeCard({ url }: ExerciseYouTubeCardProps) {
  const videoId = extractYouTubeVideoId(url);
  const { width } = useWindowDimensions();

  if (!videoId) return null;

  const playerWidth = Math.max(width - SCROLL_HORIZONTAL_PADDING, 0);
  const playerHeight = Math.round((playerWidth * 9) / 16);

  return (
    <View
      className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black"
      testID="exercise-detail.youtube"
    >
      <YoutubePlayer height={playerHeight} width={playerWidth} videoId={videoId} />
    </View>
  );
}
