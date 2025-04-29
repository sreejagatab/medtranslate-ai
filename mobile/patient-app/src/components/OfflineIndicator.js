/**
 * Offline Indicator Component for MedTranslate AI Patient App
 * 
 * Displays an indicator when the app is offline
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

class OfflineIndicator extends React.Component {
  constructor(props) {
    super(props);
    this.pulseAnimation = new Animated.Value(1);
  }
  
  componentDidMount() {
    this.startPulseAnimation();
  }
  
  startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(this.pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(this.pulseAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  render() {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: this.pulseAnimation }] }
          ]}
        >
          <MaterialIcons name="cloud-off" size={16} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.text}>Offline</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  iconContainer: {
    marginRight: 4
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  }
});

export default OfflineIndicator;
