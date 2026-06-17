import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Button,
  ScrollView,
} from 'react-native';
import { TurboEventSource } from 'react-native-turbo-sse';

export default function App() {
  const [url, setUrl] = useState('https://sse.dev/test');
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const [sse, setSse] = useState<TurboEventSource | null>(null);

  useEffect(() => {
    return () => {
      if (sse) sse.close();
    };
  }, [sse]);

  const connect = () => {
    if (!url) return;

    if (sse) sse.close();

    setMessages([]);
    setStatus('Connecting...');

    const source = new TurboEventSource(url, {
      method: 'GET',
    });

    source.onOpen(() => {
      setStatus('Connected');
    });

    source.onMessage((event) => {
      setMessages((prev) => [
        ...prev,
        `[${event.event || 'message'}] ${event.data}`,
      ]);
    });

    source.onError((err) => {
      setStatus(`Error: ${err.message}`);
    });

    setSse(source);
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

      <ScrollView style={styles.logs}>
        {messages.map((msg, idx) => (
          <Text key={idx} style={styles.logText}>
            {msg}
          </Text>
        ))}
      </ScrollView>
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
    fontSize: 12,
    marginBottom: 4,
  },
});
