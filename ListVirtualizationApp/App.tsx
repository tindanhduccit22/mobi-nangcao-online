import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import type {ListRenderItemInfo} from 'react-native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Change only this URL after you upload the JSON to your host.
const DATA_URL = 'https://taitv.synology.me/downloads/products_1000.json';

type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  stock: number;
  image: string;
  description: string;
};

type ListMode = 'ScrollView' | 'FlatList';
type Stats = {mounts: number; active: number; images: number};
type StatsRef = React.MutableRefObject<Stats>;

const ProductRow = memo(function ProductRow({
  item,
  stats,
}: {
  item: Product;
  stats: StatsRef;
}) {
  useEffect(() => {
    stats.current.mounts += 1;
    stats.current.active += 1;
    return () => {
      stats.current.active -= 1;
    };
  }, [stats]);

  return (
    <View style={styles.row}>
      <Image
        source={{uri: item.image}}
        style={styles.photo}
        resizeMode="cover"
        onLoad={() => {
          stats.current.images += 1;
        }}
      />
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.details}>
          {item.category} · {item.brand}
        </Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
    </View>
  );
});

// This panel owns its state: pressing Snapshot does NOT rerender the list.
function StatsPanel({stats}: {stats: StatsRef}) {
  const [sample, setSample] = useState<Stats>({
    mounts: 0,
    active: 0,
    images: 0,
  });
  const snapshot = () => setSample({...stats.current});

  return (
    <View style={styles.stats}>
      <Text style={styles.statText}>
        Mount events: {sample.mounts} | Active rows: {sample.active}
      </Text>
      <Text style={styles.statText}>Image loads: {sample.images}</Text>
      <Pressable style={styles.smallButton} onPress={snapshot}>
        <Text style={styles.buttonText}>Snapshot counters</Text>
      </Pressable>
    </View>
  );
}

function ListExperiment({
  items,
  mode,
}: {
  items: Product[];
  mode: ListMode;
}) {
  const stats = useRef<Stats>({mounts: 0, active: 0, images: 0});
  const renderRow = useCallback(
    ({item}: ListRenderItemInfo<Product>) => (
      <ProductRow item={item} stats={stats} />
    ),
    [],
  );

  return (
    <View style={styles.experiment}>
      <StatsPanel stats={stats} />
      {mode === 'ScrollView' ? (
        <ScrollView style={styles.list}>
          {items.map(item => (
            <ProductRow key={item.id} item={item} stats={stats} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          style={styles.list}
          data={items}
          renderItem={renderRow}
          keyExtractor={item => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      )}
    </View>
  );
}

export default function App() {
  const [allItems, setAllItems] = useState<Product[]>([]);
  const [mode, setMode] = useState<ListMode>('FlatList');
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array');
      }
      setAllItems(data as Product[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const items = allItems.slice(0, limit);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>1. List Virtualization</Text>
      <Text style={styles.help}>Same online JSON + same image row</Text>
      <Text style={styles.help}>Records received: {allItems.length}</Text>
      <View style={styles.buttons}>
        {(['ScrollView', 'FlatList'] as ListMode[]).map(value => (
          <Pressable
            key={value}
            style={[styles.button, mode === value && styles.selected]}
            onPress={() => setMode(value)}>
            <Text style={styles.buttonText}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.buttons}>
        {[100, 500, 1000].map(value => (
          <Pressable
            key={value}
            style={[styles.button, limit === value && styles.selected]}
            onPress={() => setLimit(value)}>
            <Text style={styles.buttonText}>{value} items</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator size="large" /> : null}
      {error ? <Text style={styles.error}>Fetch error: {error}</Text> : null}
      {error ? (
        <Pressable style={styles.smallButton} onPress={() => void loadData()}>
          <Text style={styles.buttonText}>Retry download</Text>
        </Pressable>
      ) : null}
      {!loading && !error && allItems.length > 0 ? (
        <ListExperiment
          key={`${mode}-${limit}`}
          mode={mode}
          items={items}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, padding: 12, backgroundColor: '#f8fafc'},
  title: {fontSize: 21, fontWeight: '700', color: '#173457'},
  help: {fontSize: 12, color: '#475569', marginTop: 3},
  buttons: {flexDirection: 'row', gap: 7, marginTop: 9},
  button: {backgroundColor: '#64748b', padding: 9, borderRadius: 6},
  selected: {backgroundColor: '#2563eb'},
  buttonText: {fontSize: 12, color: '#fff', fontWeight: '600'},
  experiment: {flex: 1, marginTop: 8},
  stats: {padding: 10, backgroundColor: '#dbeafe', borderRadius: 8},
  statText: {fontSize: 12, color: '#1e3a8a', marginBottom: 4},
  smallButton: {
    backgroundColor: '#1d4ed8',
    padding: 7,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  list: {flex: 1, marginTop: 7},
  row: {
    height: 102,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 6,
  },
  photo: {width: 96, height: 75, backgroundColor: '#cbd5e1'},
  info: {flex: 1, marginLeft: 10},
  name: {fontSize: 14, fontWeight: '600', color: '#0f172a'},
  details: {fontSize: 11, color: '#64748b'},
  price: {fontSize: 13, color: '#047857', marginTop: 5},
  error: {color: '#b91c1c', marginTop: 10},
});
