import { lightTheme, mix, rgb, type ThemeColor } from '@workout-tracker/ui-mobile';
import { ErrorToast, InfoToast, SuccessToast, type ToastConfig } from 'react-native-toast-message';

const textStyles = {
  text1Style: { fontFamily: 'Geist_600SemiBold', fontSize: 17 },
  text2Style: {
    fontFamily: 'Geist_400Regular',
    fontSize: 15,
    color: rgb(lightTheme.foreground),
  },
};

function containerStyle(color: ThemeColor) {
  return {
    borderWidth: 1,
    borderLeftWidth: 1,
    borderRadius: 12,
    borderColor: rgb(color),
    borderLeftColor: rgb(color),
    backgroundColor: mix(color, lightTheme.background, 0.75),
  };
}

export const toastConfig: ToastConfig = {
  success: (props) => (
    <SuccessToast {...props} {...textStyles} style={containerStyle(lightTheme.success)} />
  ),
  error: (props) => (
    <ErrorToast {...props} {...textStyles} style={containerStyle(lightTheme.destructive)} />
  ),
  info: (props) => (
    <InfoToast {...props} {...textStyles} style={containerStyle(lightTheme.warning)} />
  ),
};
