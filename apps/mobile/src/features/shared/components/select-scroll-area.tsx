import { type ReactNode, useState } from 'react';
import { Platform, ScrollView as RNScrollView, View } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

// On Android a plain RN ScrollView inside the select popover overlay loses the
// JS responder negotiation and won't scroll; gesture-handler's ScrollView runs
// on RNGH's native gesture pipeline and scrolls correctly. iOS scrolls fine
// with the RN ScrollView. (Same split as MultiSelectContent in ui-mobile.)
const ScrollView = Platform.OS === 'android' ? GHScrollView : RNScrollView;

type Props = {
  children: ReactNode;
  maxHeight?: number;
};

/**
 * Caps a Select dropdown's height and lets it scroll. The select popover has no
 * bounded viewport, so a long list expands to fit every item instead of
 * scrolling — measure the content and pin a height capped at `maxHeight`.
 */
export function SelectScrollArea({ children, maxHeight = 320 }: Props) {
  const [contentHeight, setContentHeight] = useState(maxHeight);

  return (
    <ScrollView
      style={{ height: Math.min(contentHeight, maxHeight) }}
      bounces={false}
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>{children}</View>
    </ScrollView>
  );
}
