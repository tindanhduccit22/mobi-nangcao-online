import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {
  accelerometer,
  SensorTypes,
  setUpdateIntervalForType,
} from 'react-native-sensors';

type Sample = {x: number; y: number; z: number};
type Subscription = {unsubscribe: () => void};

export default function App() {
  const [values, setValues] = useState<Sample>({x: 0, y: 0, z: 0});
  const [intensity, setIntensity] = useState(0);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [threshold, setThreshold] = useState('3.0');
  const subscription = useRef<Subscription | null>(null);
  const gravity = useRef<Sample>({x: 0, y: 0, z: 0});
  const lastShake = useRef(0);
  const thresholdValue = useRef(3.0);

  function start() {
    if (subscription.current) return;
    setError('');
    gravity.current = {x: 0, y: 0, z: 0};
    lastShake.current = Date.now();
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    subscription.current = accelerometer.subscribe({
      next: ({x, y, z}) => {
        setValues({x, y, z});
        const g = gravity.current;
        const alpha = 0.8;
        const nextG = {
          x: alpha * g.x + (1 - alpha) * x,
          y: alpha * g.y + (1 - alpha) * y,
          z: alpha * g.z + (1 - alpha) * z,
        };
        gravity.current = nextG;
        const movement = Math.hypot(
          x - nextG.x,
          y - nextG.y,
          z - nextG.z,
        );
        setIntensity(movement);
        const now = Date.now();
        if (movement >= thresholdValue.current && now - lastShake.current >= 750) {
          setCount(old => old + 1);
          lastShake.current = now;
        }
      },
      error: () => {
        setError('Accelerometer is unavailable or cannot be read.');
        subscription.current = null;
        setRunning(false);
      },
    });
    setRunning(true);
  }

  function stop() {
    subscription.current?.unsubscribe();
    subscription.current = null;
    setRunning(false);
  }

  function reset() {
    setCount(0);
    setIntensity(0);
    lastShake.current = Date.now();
  }

  function changeThreshold(text: string) {
    setThreshold(text);
    const value = Number(text);
    if (text.trim() && Number.isFinite(value) && value > 0) {
      thresholdValue.current = value;
    }
  }

  useEffect(() => {
    return () => subscription.current?.unsubscribe();
  }, []);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Shake Detector</Text>
      <Text>X: {values.x.toFixed(2)} m/s²</Text>
      <Text>Y: {values.y.toFixed(2)} m/s²</Text>
      <Text>Z: {values.z.toFixed(2)} m/s²</Text>
      <Text>Motion: {intensity.toFixed(2)} m/s²</Text>
      <Text style={styles.count}>Shakes: {count}</Text>
      <Text>Threshold (m/s²)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={threshold}
        onChangeText={changeThreshold}
      />
      <Text>Status: {running ? 'Reading' : 'Stopped'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={start}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={stop}>
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, padding: 24, gap: 12, backgroundColor: '#fff'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 12},
  count: {fontSize: 22, fontWeight: 'bold', color: '#135fb2'},
  input: {borderWidth: 1, borderColor: '#999', padding: 8},
  buttons: {flexDirection: 'row', gap: 10, marginTop: 8},
  button: {backgroundColor: '#145eaa', padding: 11, borderRadius: 6},
  buttonText: {color: '#fff', fontWeight: 'bold'},
  error: {color: '#b91c1c'},
});
