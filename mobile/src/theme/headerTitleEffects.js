import { Text, StyleSheet } from 'react-native';
import { relativeLuminance } from './contrast';

/** Screen header title — mirrors AdultHomeScreen “Adult dashboard”. */
export const TEEN_DASHBOARD_TITLE = 'Teen dashboard';

export const SCREEN_HEADER_TITLE_FONT_SIZE = 28;

/** Header title halo — tweak radius/opacity here. Always on all ScreenHeader titles. */
export const HEADER_TITLE_HALO = {
  radius: 3,
  opacity: 1,
};

export function getTitleEffectColor(headerBackground, opacity = 1) {
  const useLightText = relativeLuminance(headerBackground) < 0.45;
  if (useLightText) {
    return `rgba(15, 23, 42, ${opacity})`;
  }
  return `rgba(255, 255, 255, ${opacity})`;
}

export function getHaloTextStyle(headerBackground) {
  return {
    textShadowColor: getTitleEffectColor(headerBackground, HEADER_TITLE_HALO.opacity),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: HEADER_TITLE_HALO.radius,
  };
}

/** Typography + halo for every screen header title. */
export function getScreenHeaderTitleStyle(headerBackground, headerText) {
  return [
    {
      fontSize: SCREEN_HEADER_TITLE_FONT_SIZE,
      fontWeight: '700',
      color: headerText,
    },
    getHaloTextStyle(headerBackground),
  ];
}

/** All in-app screen headers render through ScreenHeader → ScreenHeaderTitle. */
export function ScreenHeaderTitle({
  title,
  headerBackground,
  headerText,
  style,
  numberOfLines = 2,
}) {
  return (
    <Text
      style={[
        styles.screenHeaderTitle,
        style,
        { color: headerText },
        getHaloTextStyle(headerBackground),
      ]}
      numberOfLines={numberOfLines}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  screenHeaderTitle: {
    fontSize: SCREEN_HEADER_TITLE_FONT_SIZE,
    fontWeight: '700',
  },
});
