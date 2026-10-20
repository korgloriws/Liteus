import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // Widgets nativos da home (só Android / build nativo — não funciona no Expo Go)
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
