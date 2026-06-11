import {
  EmptyState,
  rgb,
  Text,
  ToggleGroup,
  ToggleGroupItem,
  useTheme,
} from '@workout-tracker/ui-mobile';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { MuscleSetVolume } from '@/features/muscles/lib/build-muscle-set-volumes';

const LEVELS = [1, 2, 3] as const;
type Level = (typeof LEVELS)[number];

const BAR_DURATION = 420;

type Row = { slug: string; name: string; sets: number; fraction: number };

export type MuscleVolumeChartProps = {
  volumes: MuscleSetVolume[];
};

/**
 * Ranking tipográfico de séries por músculo, ordenado do maior ao menor. A barra
 * codifica magnitude pelo comprimento; o número é o protagonista. Apresentacional:
 * recebe os volumes já agregados, com toggle entre os 3 níveis da hierarquia.
 */
export function MuscleVolumeChart({ volumes }: MuscleVolumeChartProps) {
  const { t } = useTranslation();
  const [level, setLevel] = useState<Level>(2);

  const muscleName = (slug: string) => t(`muscles.${slug}` as never) as string;

  const ranked = volumes
    .filter((entry) => entry.level === level && entry.sets > 0)
    .sort((a, b) => b.sets - a.sets);
  const max = ranked.reduce((peak, entry) => Math.max(peak, entry.sets), 0);
  const rows: Row[] = ranked.map((entry) => ({
    slug: entry.slug,
    name: muscleName(entry.slug),
    sets: entry.sets,
    fraction: max > 0 ? entry.sets / max : 0,
  }));

  return (
    <View className="gap-5">
      <ToggleGroup
        type="single"
        value={String(level)}
        onValueChange={(value) => {
          if (value) setLevel(Number(value) as Level);
        }}
        variant="outline"
        className="w-full"
      >
        {LEVELS.map((value, index) => (
          <ToggleGroupItem
            key={value}
            value={String(value)}
            isFirst={index === 0}
            isLast={index === LEVELS.length - 1}
            className="flex-1"
          >
            <Text>{t(`workoutFormScreen.muscleVolume.levels.${value}` as never)}</Text>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {rows.length === 0 ? (
        <EmptyState
          title={t('workoutFormScreen.muscleVolume.empty.title')}
          subtitle={t('workoutFormScreen.muscleVolume.empty.subtitle')}
        />
      ) : (
        <View className="gap-4">
          {rows.map((row) => (
            <VolumeRow key={row.slug} row={row} />
          ))}
        </View>
      )}
    </View>
  );
}

function VolumeRow({ row }: { row: Row }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? row.fraction : 0);

  useEffect(() => {
    progress.value = reducedMotion
      ? row.fraction
      : withTiming(row.fraction, { duration: BAR_DURATION, easing: Easing.out(Easing.cubic) });
  }, [row.fraction, reducedMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(progress.value, 0.0001) }],
  }));

  return (
    <View
      className="gap-2"
      accessible
      accessibilityLabel={t('workoutFormScreen.muscleVolume.rowA11y', {
        name: row.name,
        count: row.sets,
      })}
    >
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="flex-1 font-sans text-base text-foreground" numberOfLines={1}>
          {row.name}
        </Text>
        <Text
          className="font-sans-semibold text-foreground text-lg"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {row.sets}
        </Text>
      </View>
      <View
        className="h-2.5 overflow-hidden rounded-full"
        style={{ backgroundColor: rgb(theme.muted) }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              width: '100%',
              borderRadius: 9999,
              backgroundColor: rgb(theme.chart2),
              transformOrigin: '0% 50%',
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}
