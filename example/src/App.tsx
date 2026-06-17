import { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
} from 'react-native';
import { TurboEventSource } from 'react-native-turbo-sse';

// Replace with your local machine's IP address if testing on a physical device
const defaultUrl = 'http://YOUR_AI_API';

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

  const setupListeners = (source: TurboEventSource) => {
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

      // Try to parse Gemini format, otherwise fall back to raw data
      let token = event.data;
      try {
        const payload = JSON.parse(event.data);
        if (payload.candidates?.[0]?.content?.parts?.[0]?.text) {
          token = payload.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        // Not JSON or not Gemini format, keep raw token
      }

      // Accumulate tokens in the mutable ref
      bufferRef.current += token;

      // Throttle state updates to 30 FPS
      if (!flushTimeoutRef.current) {
        flushTimeoutRef.current = setTimeout(() => {
          const newChunk = bufferRef.current;
          bufferRef.current = '';
          flushTimeoutRef.current = null;

          const MAX_CHARS = 1000;
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
    source.connect();
  };

  const connect = () => {
    if (!url) return;
    if (sse) sse.close();

    setMessages([]);
    bufferRef.current = '';
    setStatus('Connecting...');

    const source = new TurboEventSource(url, {
      method: 'GET',
    });

    setupListeners(source);
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
