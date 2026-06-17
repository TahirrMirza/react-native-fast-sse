import { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  ScrollView,
} from 'react-native';
import { TurboEventSource } from 'react-native-turbo-sse';

const defaultUrl = 'http://192.168.1.5:3000';

export default function App() {
  const [url, setUrl] = useState(defaultUrl);
  // Store text chunks instead of a single massive string
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const [sse, setSse] = useState<TurboEventSource | null>(null);

  // Refs for high-frequency rendering optimization
  const bufferRef = useRef('');
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref for the FlatList to auto-scroll
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    return () => {
      if (sse) sse.close();
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    };
  }, [sse]);

  const connect = () => {
    if (!url) return;

    if (sse) sse.close();

    setMessages([]);
    bufferRef.current = '';
    setStatus('Connecting...');

    const source = new TurboEventSource(url, {
      method: 'GET',
    });

    source.onOpen(() => {
      setStatus('Connected');
    });

    source.onMessage((event) => {
      if (event.data === '[DONE]') {
        // Flush any remaining text in the buffer
        if (bufferRef.current) {
          const finalChunk = bufferRef.current;
          setMessages((prev) => [...prev, finalChunk]);
          bufferRef.current = '';
        }
        setStatus('Stream Complete');
        source.close();
        return;
      }

      // Accumulate tokens in the mutable ref (extremely fast, doesn't trigger renders)
      bufferRef.current += event.data;

      // Throttle state updates to 30 FPS (roughly every 32ms) to prevent freezing
      if (!flushTimeoutRef.current) {
        flushTimeoutRef.current = setTimeout(() => {
          const newChunk = bufferRef.current;
          bufferRef.current = '';
          flushTimeoutRef.current = null;

          // Truncate massive single chunks so the React Native Text layout engine (Yoga) doesn't completely freeze
          const MAX_CHARS = 500;
          const safeChunk =
            newChunk.length > MAX_CHARS
              ? newChunk.substring(0, MAX_CHARS) +
                `\n\n...[TRUNCATED ${newChunk.length - MAX_CHARS} characters to prevent UI freeze]...`
              : newChunk;

          setMessages((prev) => [...prev, safeChunk]);
        }, 32);
      }
    });

    source.onError((err) => {
      setStatus(`Error: ${err.message}`);
    });

    setSse(source);

    // Explicitly start the connection
    source.connect();
  };

  const disconnect = () => {
    if (sse) {
      sse.close();
      setSse(null);
      setStatus('Disconnected');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Turbo SSE Demo</Text>
      <TextInput
        style={styles.input}
        placeholder="SSE Endpoint URL"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
      />

      <View style={styles.row}>
        <Button title="Connect" onPress={connect} />
        <Button title="Disconnect" onPress={disconnect} color="red" />
      </View>

      <View style={styles.scenariosContainer}>
        <Text style={styles.scenariosTitle}>Test Scenarios:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scenarioScroll}
        >
          <View style={styles.scenarioBtn}>
            <Button
              title="Firehose"
              onPress={() => setUrl('http://192.168.1.5:3000/firehose')}
            />
          </View>
          <View style={styles.scenarioBtn}>
            <Button
              title="Massive 1MB"
              onPress={() => setUrl('http://192.168.1.5:3000/massive-payload')}
            />
          </View>
          <View style={styles.scenarioBtn}>
            <Button
              title="Slow Drip"
              onPress={() => setUrl('http://192.168.1.5:3000/slow-drip')}
            />
          </View>
          <View style={styles.scenarioBtn}>
            <Button
              title="Error Drop"
              onPress={() => setUrl('http://192.168.1.5:3000/error-drop')}
            />
          </View>
          <View style={styles.scenarioBtn}>
            <Button
              title="Infinite"
              onPress={() => setUrl('http://192.168.1.5:3000/infinite')}
            />
          </View>
        </ScrollView>
      </View>

      <Text style={styles.status}>Status: {status}</Text>

      {/* Use FlatList to safely render massive text blocks without freezing Yoga */}
      <FlatList
        ref={flatListRef}
        style={styles.logs}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.logText}>{item}</Text>}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        onLayout={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  status: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scenariosContainer: {
    marginBottom: 20,
    backgroundColor: '#e9ecef',
    padding: 10,
    borderRadius: 8,
  },
  scenariosTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scenarioScroll: {
    flexDirection: 'row',
  },
  scenarioBtn: {
    marginRight: 10,
  },
  logs: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
});
