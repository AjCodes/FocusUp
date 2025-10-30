import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for Metro / device logs
    console.error('Root error boundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: '#0A0F1C', justifyContent: 'center' }}>
            <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>Something went wrong</Text>
            {!!this.state.error?.message && (
              <Text selectable style={{ color: '#CBD5E1' }}>{this.state.error?.message}</Text>
            )}
            <Pressable onPress={this.reset} style={{ backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ color: '#0A0F1C', fontWeight: '700' }}>Try again</Text>
            </Pressable>
          </View>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
