import { useWindowDimensions, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { extractYouTubeVideoId } from '@/features/shared/lib/youtube';

const DEFAULT_HORIZONTAL_PADDING = 32;

export type ExerciseYouTubeCardProps = {
  url: string;
  /** Total horizontal padding around the card, used to size the embedded
   *  player. Defaults to the exercise detail screen's content padding. */
  horizontalPadding?: number;
};

/** YouTube demonstration video embedded via the IFrame Player API. */
export function ExerciseYouTubeCard({
  url,
  horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
}: ExerciseYouTubeCardProps) {
  const videoId = extractYouTubeVideoId(url);
  const { width } = useWindowDimensions();

  if (!videoId) return null;

  const playerWidth = Math.max(width - horizontalPadding, 0);
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
