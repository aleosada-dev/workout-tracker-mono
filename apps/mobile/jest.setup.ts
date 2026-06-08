import { server } from './src/mocks/server';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const FadeOutUp = { duration: () => FadeOutUp };
  const FadeIn = { duration: () => FadeIn, delay: () => FadeIn };
  const FadeOut = { duration: () => FadeOut, delay: () => FadeOut };
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
    withRepeat: (v: unknown) => v,
    runOnJS: (fn: unknown) => fn,
    interpolate: () => 0,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    FadeOutUp,
    FadeIn,
    FadeOut,
    LinearTransition,
    LayoutAnimationConfig,
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView, TextInput } = require('react-native');
  const passthrough = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  return {
    __esModule: true,
    default: passthrough,
    BottomSheetModal: passthrough,
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ScrollView,
    BottomSheetView: View,
    BottomSheetTextInput: TextInput,
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@quidone/react-native-wheel-picker', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@expo/ui/swift-ui', () => {
  const { View } = require('react-native');
  return { Host: View, HStack: View, Picker: View, Text: View };
});
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  frame: () => ({}),
  pickerStyle: () => ({}),
  tag: () => ({}),
}));

// Render portalled content inline so tests can query it without a PortalHost,
// and so the portal's module-global store can't leak between test cases.
jest.mock('@rn-primitives/portal', () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
  PortalHost: () => null,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
