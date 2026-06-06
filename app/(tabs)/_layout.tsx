import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Pulse', tabBarIcon: ({ color, size }) => <Ionicons name="pulse" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="movers"
        options={{ title: 'Movers', tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="anticipated"
        options={{ title: 'Anticipated', tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="list"
        options={{ title: 'My List', tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
