import React, {useEffect, useState} from 'react';
import {
  Alert,
  DeviceEventEmitter,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type CompassEvent = {azimuth: number};

type CompassAPI = {
  startCompass: () => void;
  stopCompass: () => void;
};

const CompassModule: CompassAPI | undefined = NativeModules.CompassModule;

export default function App() {
  const [direction, setDirection] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'CompassUpdate',
      (event: CompassEvent) => {
        if (
          typeof event?.azimuth === 'number' &&
          Number.isFinite(event.azimuth)
        ) {
          setDirection(event.azimuth);
        }
      },
    );

    return () => {
      subscription.remove();
      CompassModule?.stopCompass();
    };
  }, []);

  function startTracking() {
    if (!CompassModule) {
      Alert.alert(
        'Module not found',
        'Check CompassPackage registration and rebuild the app.',
      );
      return;
    }
    setDirection(null);
    CompassModule.startCompass();
    setIsTracking(true);
  }

  function stopTracking() {
    CompassModule?.stopCompass();
    setIsTracking(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📍 Compass Tracker</Text>
      <Text style={styles.direction}>
        Direction: {direction === null ? '--' : Math.round(direction)}°
      </Text>
      <Pressable
        onPress={isTracking ? stopTracking : startTracking}
        style={[
          styles.button,
          isTracking ? styles.stopButton : styles.startButton,
        ]}
        accessibilityRole="button">
        <Text style={styles.buttonText}>
          {isTracking ? 'STOP' : 'START'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  title: {fontSize: 20, fontWeight: '700', color: '#007AFF'},
  direction: {
    marginTop: 14,
    marginBottom: 14,
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  button: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderRadius: 6,
    elevation: 2,
  },
  startButton: {backgroundColor: '#007AFF'},
  stopButton: {backgroundColor: '#DC3545'},
  buttonText: {color: '#FFFFFF', fontSize: 12, fontWeight: '700'},
});
