import { Text, ToggleGroup, ToggleGroupIcon, ToggleGroupItem } from '@workout-tracker/ui-mobile';
import { CirclePlay, Smartphone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export type VideoSource = 'uploaded' | 'youtube';

export type VideoSourceToggleProps = {
  source: VideoSource;
  onChange: (next: VideoSource) => void;
};

/** Segmented control that switches between the uploaded MP4 and the YouTube demo. */
export function VideoSourceToggle({ source, onChange }: VideoSourceToggleProps) {
  const { t } = useTranslation();
  return (
    <ToggleGroup
      type="single"
      value={source}
      onValueChange={(value) => {
        if (value === 'uploaded' || value === 'youtube') onChange(value);
      }}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem
        value="uploaded"
        isFirst
        className="flex-1"
        testID="exercise-detail.video.source.uploaded"
      >
        <ToggleGroupIcon as={Smartphone} />
        <Text>{t('exerciseDetailScreen.video.source.uploaded')}</Text>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="youtube"
        isLast
        className="flex-1"
        testID="exercise-detail.video.source.youtube"
      >
        <ToggleGroupIcon as={CirclePlay} />
        <Text>{t('exerciseDetailScreen.video.source.youtube')}</Text>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
