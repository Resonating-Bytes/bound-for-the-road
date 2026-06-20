import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
} from 'react-native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemePickerSection } from '../../components/ThemePickerSection';

const BASE_BOTTOM_PADDING = 48;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function configureKeyboardDismissAnimation(duration) {
  LayoutAnimation.configureNext({
    duration: duration ?? 250,
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  });
}

export function SettingsAppearanceScreen({ navigation }) {
  const scrollRef = useRef(null);
  const scrollOffsetY = useRef(0);
  const keyboardHeightRef = useRef(0);
  const focusedInputRef = useRef(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const scheduleAlignInput = useCallback((inputRef) => {
    const run = (attempt = 0) => {
      const keyboardHeight = keyboardHeightRef.current;
      const target = inputRef?.current;

      if (!target) return;

      if (!keyboardHeight) {
        if (attempt < 12) {
          setTimeout(() => run(attempt + 1), 50);
        }
        return;
      }

      target.measureInWindow((_x, inputY, _width, inputHeight) => {
        const windowHeight = Dimensions.get('window').height;
        const visibleHeight = windowHeight - keyboardHeight;
        const targetCenterY = visibleHeight / 2;
        const inputCenterY = inputY + inputHeight / 2;
        const delta = inputCenterY - targetCenterY;

        if (Math.abs(delta) < 8) return;

        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollOffsetY.current + delta),
          animated: true,
        });
      });
    };

    setTimeout(() => run(0), Platform.OS === 'ios' ? 80 : 40);
  }, []);

  useEffect(() => {
    const onWillShow = (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardInset(event.endCoordinates.height);
    };

    const onDidShow = () => {
      if (focusedInputRef.current) {
        scheduleAlignInput(focusedInputRef.current);
      }
    };

    const onWillHide = (event) => {
      configureKeyboardDismissAnimation(event?.duration);
      keyboardHeightRef.current = 0;
      setKeyboardInset(0);
      focusedInputRef.current = null;
    };

    const willShowSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onWillShow,
    );
    const didShowSub = Keyboard.addListener('keyboardDidShow', onDidShow);
    const willHideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onWillHide,
    );

    return () => {
      willShowSub.remove();
      didShowSub.remove();
      willHideSub.remove();
    };
  }, [scheduleAlignInput]);

  const scrollInputIntoView = useCallback(
    (inputRef) => {
      if (!inputRef?.current) return;
      focusedInputRef.current = inputRef;

      if (keyboardHeightRef.current > 0) {
        scheduleAlignInput(inputRef);
      }
    },
    [scheduleAlignInput],
  );

  return (
    <Screen withHeader>
      <ScreenHeader title="Appearance" onBack={() => navigation.goBack()} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BASE_BOTTOM_PADDING + keyboardInset },
        ]}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          scrollOffsetY.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <ThemePickerSection onCustomColorInputFocus={scrollInputIntoView} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
