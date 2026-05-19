import { server } from './src/mocks/server';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const FadeOutUp = { duration: () => FadeOutUp };
  const LinearTransition = { duration: () => LinearTransition };
  const LayoutAnimationConfig = ({ children }: { children: React.ReactNode }) => children;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    createAnimatedComponent: (c: unknown) => c,
    useAnimatedStyle: () => ({}),
    useSharedValue: (v: unknown) => ({ value: v }),
    withTiming: (v: unknown) => v,
    withSpring: (v: unknown) => v,
    runOnJS: (fn: unknown) => fn,
    interpolate: () => 0,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    FadeOutUp,
    LinearTransition,
    LayoutAnimationConfig,
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  const passthrough = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  return {
    __esModule: true,
    default: passthrough,
    BottomSheetModal: passthrough,
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ScrollView,
    BottomSheetView: View,
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
