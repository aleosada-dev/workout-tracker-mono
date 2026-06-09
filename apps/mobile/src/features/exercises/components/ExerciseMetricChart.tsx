import { Geist_400Regular } from '@expo-google-fonts/geist';
import {
  Circle,
  RoundedRect,
  type SkFont,
  Line as SkLine,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { rgb, type Theme, useTheme } from '@workout-tracker/ui-mobile';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { formatMetricTick, niceYAxis } from '@/features/charts/lib/charts';
import type { MetricChartPoint } from '@/features/charts/lib/types';
import type { ExerciseMetricKey } from '@/features/exercises/lib/detail-types';
import { useDateFnsLocale } from '@/features/shared/hooks/use-date-fns-locale';

const CHART_HEIGHT = 220;
const TOOLTIP_FONT_SIZE = 12;
const TOOLTIP_PAD_X = 8;
const TOOLTIP_PAD_Y = 4;
const TOOLTIP_OFFSET_Y = 12;
const DOT_RADIUS = 5;
const MARK_RADIUS = 4;

export type ExerciseMetricChartProps = {
  metric: ExerciseMetricKey;
  points: MetricChartPoint[];
};

/** Line chart of one metric's history over the recorded sessions. */
export function ExerciseMetricChart({ metric, points }: ExerciseMetricChartProps) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const locale = useDateFnsLocale();
  const theme = useTheme();
  const font = useFont(Geist_400Regular, 12);
  const tooltipFont = useFont(Geist_400Regular, TOOLTIP_FONT_SIZE);
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

  const data = useMemo(() => points.map((p, i) => ({ x: i, y: p.value })), [points]);
  const { domain: yDomain, ticks: yTicks } = useMemo(
    () => niceYAxis(points.map((p) => p.value)),
    [points],
  );
  // One tick per data point. Victory-native downsamples to ~5 via the default
  // `tickCount` when the series is too dense to fit every label.
  const xTicks = useMemo(() => points.map((_, i) => i), [points]);

  // Pre-format the value of each point on the JS side. The tooltip worklet
  // only does an index lookup (formatMetricTick isn't workletizable).
  const formattedValues = useMemo(
    () => points.map((p) => formatMetricTick(metric, p.value, language)),
    [points, metric, language],
  );

  const tooltipText = useDerivedValue(() => {
    const idx = state.matchedIndex.value;
    return formattedValues[idx] ?? '';
  });

  return (
    <View style={{ height: CHART_HEIGHT }}>
      <CartesianChart
        data={data}
        xKey="x"
        yKeys={['y']}
        domain={{ y: yDomain }}
        domainPadding={{ left: 32, right: 32, top: 24, bottom: 8 }}
        chartPressState={state}
        axisOptions={{
          font,
          // No grid/frame lines — just the metric line and the tick labels.
          lineWidth: { grid: 0, frame: 0 },
          labelColor: rgb(theme.mutedForeground),
          tickValues: { x: xTicks, y: yTicks },
          formatXLabel: (value) => {
            const point = points[Math.round(value)];
            return point ? format(new Date(point.date), 'dd MMM', { locale }) : '';
          },
          formatYLabel: (value) => formatMetricTick(metric, value, language),
        }}
      >
        {({ points: chartPoints, chartBounds }) => (
          <>
            <Line
              points={chartPoints.y}
              color={rgb(theme.chart1)}
              strokeWidth={2}
              curveType="linear"
            />
            {/* Marca cada ponto — torna um dataset de ponto único visível (a linha
                não desenha nada com um só ponto) e dá um alvo de toque para o valor. */}
            {chartPoints.y.map((point) =>
              point.y == null ? null : (
                <Circle
                  key={point.xValue}
                  cx={point.x}
                  cy={point.y}
                  r={MARK_RADIUS}
                  color={rgb(theme.chart1)}
                />
              ),
            )}
            {isActive ? (
              <ActiveTooltip
                xPos={state.x.position}
                yPos={state.y.y.position}
                text={tooltipText}
                font={tooltipFont}
                chartBounds={chartBounds}
                theme={theme}
              />
            ) : null}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

type ChartBounds = { left: number; right: number; top: number; bottom: number };

type ActiveTooltipProps = {
  xPos: SharedValue<number>;
  yPos: SharedValue<number>;
  text: SharedValue<string>;
  font: SkFont | null;
  chartBounds: ChartBounds;
  theme: Theme;
};

function ActiveTooltip({ xPos, yPos, text, font, chartBounds, theme }: ActiveTooltipProps) {
  const boxHeight = TOOLTIP_FONT_SIZE + 2 * TOOLTIP_PAD_Y;

  const crosshairP1 = useDerivedValue(() => vec(xPos.value, chartBounds.top));
  const crosshairP2 = useDerivedValue(() => vec(xPos.value, chartBounds.bottom));

  const boxWidth = useDerivedValue(() => {
    if (!font) return 0;
    const t = text.value;
    if (!t) return 0;
    const widths = font.getGlyphWidths(font.getGlyphIDs(t));
    let w = 0;
    for (let i = 0; i < widths.length; i++) w += widths[i];
    return w + 2 * TOOLTIP_PAD_X;
  });

  const boxX = useDerivedValue(() => {
    const w = boxWidth.value;
    let x = xPos.value - w / 2;
    if (x < chartBounds.left) x = chartBounds.left;
    if (x + w > chartBounds.right) x = chartBounds.right - w;
    return x;
  });

  const boxY = useDerivedValue(() => {
    const y = yPos.value - boxHeight - TOOLTIP_OFFSET_Y;
    return y < chartBounds.top ? chartBounds.top : y;
  });

  const textX = useDerivedValue(() => boxX.value + TOOLTIP_PAD_X);
  const textY = useDerivedValue(() => boxY.value + boxHeight - TOOLTIP_PAD_Y - 1);

  return (
    <>
      <SkLine p1={crosshairP1} p2={crosshairP2} color={rgb(theme.border)} strokeWidth={1} />
      <Circle cx={xPos} cy={yPos} r={DOT_RADIUS} color={rgb(theme.chart1)} />
      <RoundedRect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        r={6}
        color={rgb(theme.popover)}
      />
      {font ? (
        <SkText x={textX} y={textY} text={text} font={font} color={rgb(theme.popoverForeground)} />
      ) : null}
    </>
  );
}
