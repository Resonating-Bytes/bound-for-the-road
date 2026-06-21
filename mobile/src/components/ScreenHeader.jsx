import { Platform, StyleSheet, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';

import { ScreenHeaderTitle } from '../theme/headerTitleEffects';

import { ScreenHeaderBanners } from './ScreenHeaderBanners';

import { IconCircleButton } from './IconCircleButton';



/** Shared app header bar — all screen titles use ScreenHeaderTitle (halo light, always on). */

export function ScreenHeader({ title, onBack, rightAction }) {

  const insets = useSafeAreaInsets();

  const { theme } = useTheme();

  const backIcon = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back';



  return (

    <View style={styles.wrapper}>

      <View

        style={[

          styles.headerBar,

          {

            paddingTop: insets.top + 12,

            backgroundColor: theme.headerBackground,

            borderBottomColor: theme.headerBorder,

          },

        ]}

      >

        <View style={styles.row}>

          {onBack ? (

            <IconCircleButton

              icon={backIcon}

              onPress={onBack}

              accessibilityLabel="Go back"

              iconSize={Platform.OS === 'ios' ? 22 : 20}

            />

          ) : null}

          <ScreenHeaderTitle

            title={title}

            headerBackground={theme.headerBackground}

            headerText={theme.headerText}

            style={styles.title}

          />

          <View style={styles.rightSlot}>{rightAction ?? null}</View>

        </View>

      </View>

      <ScreenHeaderBanners />

    </View>

  );

}



const BACK_SIZE = 36;



const styles = StyleSheet.create({

  wrapper: {

    backgroundColor: 'transparent',

  },

  headerBar: {

    borderBottomWidth: 4,

    paddingHorizontal: 16,

    paddingBottom: 12,

  },

  row: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

  },

  title: {

    flex: 1,

  },

  rightSlot: {

    minWidth: BACK_SIZE,

    alignItems: 'flex-end',

  },

});

