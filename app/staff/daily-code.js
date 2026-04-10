import { SafeAreaView, Text, View } from 'react-native';

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Staff screen</Text>
      </View>
    </SafeAreaView>
  );
}