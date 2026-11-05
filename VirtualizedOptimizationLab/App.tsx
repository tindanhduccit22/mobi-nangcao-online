import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import type {ListRenderItemInfo} from 'react-native';
import {
  ActivityIndicator,
  VirtualizedList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Public dataset already uploaded to the teacher's Synology host.
const DATA_URL = 'https://taitv.synology.me/downloads/products_1000.json';
const ROW_HEIGHT = 100;

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

type Counter = {renders: number};
type CounterRef = React.MutableRefObject<Counter>;
type Mode = 'BASIC' | 'OPTIMIZED';

const productKey = (item: Product) => item.id;
const getItem = (data: Product[], index: number) => data[index];
const getItemCount = (data: Product[]) => data.length;

function ProductRow({
  item,
  counter,
}: {
  item: Product;
  counter: CounterRef;
}) {
  // Every function-component invocation counts as one render attempt.
  counter.current.renders += 1;
  return (
    <View style={styles.row}>
      <Image source={{uri: item.image}} style={styles.photo} />
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.small}>
          {item.category} · {item.brand}
        </Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const MemoRow = memo(ProductRow);

function CounterPanel({counter}: {counter: CounterRef}) {
  const [shown, setShown] = useState(0);
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Row render calls: {shown}</Text>
      <View style={styles.buttons}>
        <Pressable
          style={styles.action}
          onPress={() => setShown(counter.current.renders)}>
          <Text style={styles.buttonText}>Snapshot</Text>
        </Pressable>
        <Pressable
          style={styles.action}
          onPress={() => {
            counter.current.renders = 0;
            setShown(0);
          }}>
          <Text style={styles.buttonText}>Reset counter</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BasicList({
  items,
  counter,
}: {
  items: Product[];
  counter: CounterRef;
}) {
  // Intentionally recreated on each parent render (baseline version).
  return (
    <VirtualizedList
      style={styles.list}
      data={items}
      getItem={getItem}
      getItemCount={getItemCount}
      keyExtractor={productKey}
      renderItem={({item}) => <ProductRow item={item} counter={counter} />}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
    />
  );
}

function OptimizedList({
  items,
  counter,
}: {
  items: Product[];
  counter: CounterRef;
}) {
  const renderRow = useCallback(
    ({item}: ListRenderItemInfo<Product>) => (
      <MemoRow item={item} counter={counter} />
    ),
    [counter],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Product> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <VirtualizedList
      style={styles.list}
      data={items}
      getItem={getItem}
      getItemCount={getItemCount}
      keyExtractor={productKey}
      renderItem={renderRow}
      getItemLayout={getItemLayout}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
    />
  );
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mode, setMode] = useState<Mode>('BASIC');
  const [headerChanges, setHeaderChanges] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const counter = useRef<Counter>({renders: 0});

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
      setProducts(data as Product[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const changeFirstPrice = () => {
    setProducts(old =>
      old.map((item, index) =>
        index === 0 ? {...item, price: item.price + 1} : item,
      ),
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>2. Optimize VirtualizedList</Text>
      <Text style={styles.small}>Online JSON: {products.length} products</Text>
      <Text style={styles.small}>Header updates: {headerChanges}</Text>
      <View style={styles.buttons}>
        {(['BASIC', 'OPTIMIZED'] as Mode[]).map(value => (
          <Pressable
            key={value}
            style={[styles.action, mode === value && styles.selected]}
            onPress={() => setMode(value)}>
            <Text style={styles.buttonText}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.buttons}>
        <Pressable
          style={styles.action}
          onPress={() => setHeaderChanges(old => old + 1)}>
          <Text style={styles.buttonText}>Update header</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={changeFirstPrice}>
          <Text style={styles.buttonText}>Change first price</Text>
        </Pressable>
      </View>
      <CounterPanel counter={counter} />
      {loading ? <ActivityIndicator size="large" /> : null}
      {error ? <Text style={styles.error}>Fetch error: {error}</Text> : null}
      {error ? (
        <Pressable style={styles.action} onPress={() => void loadData()}>
          <Text style={styles.buttonText}>Retry download</Text>
        </Pressable>
      ) : null}
      {!loading && !error && products.length > 0 ? (
        mode === 'BASIC' ? (
          <BasicList items={products} counter={counter} />
        ) : (
          <OptimizedList items={products} counter={counter} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, padding: 12, backgroundColor: '#f8fafc'},
  title: {fontSize: 20, fontWeight: '700', color: '#173457'},
  small: {fontSize: 12, color: '#475569', marginTop: 5},
  buttons: {flexDirection: 'row', gap: 8, marginTop: 8},
  action: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#64748b',
    borderRadius: 6,
  },
  selected: {backgroundColor: '#2563eb'},
  buttonText: {fontSize: 12, fontWeight: '600', color: '#fff'},
  panel: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  label: {fontSize: 13, fontWeight: '600', color: '#1e3a8a'},
  list: {flex: 1, marginTop: 8},
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 6,
  },
  photo: {width: 94, height: 74, backgroundColor: '#cbd5e1'},
  info: {flex: 1, marginLeft: 10},
  name: {fontSize: 14, fontWeight: '600', color: '#0f172a'},
  price: {fontSize: 13, color: '#047857', marginTop: 5},
  error: {color: '#b91c1c', marginTop: 10},
});
