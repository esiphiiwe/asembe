import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenState } from './ui/screen-state';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-neutral-50">
          <View className="flex-1">
            <ScreenState
              icon="⚠️"
              title="Something went wrong"
              description="The app ran into an unexpected error. Tap below to try again."
              actionLabel="Try again"
              onAction={this.handleReset}
              fullScreen
            />
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
