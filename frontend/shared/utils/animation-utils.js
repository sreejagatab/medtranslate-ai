/**
 * Animation Utilities for MedTranslate AI
 * 
 * This module provides utility functions for creating smooth animations
 * in React Native components.
 */

import { Animated, Easing } from 'react-native';

/**
 * Create a fade-in animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const fadeIn = (value, duration = 300, callback = null) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    easing: Easing.ease,
    useNativeDriver: true,
    isInteraction: false
  }).start(callback);
};

/**
 * Create a fade-out animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const fadeOut = (value, duration = 300, callback = null) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.ease,
    useNativeDriver: true,
    isInteraction: false
  }).start(callback);
};

/**
 * Create a slide-in animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} from - Starting position
 * @param {number} to - Ending position
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const slideIn = (value, from, to, duration = 300, callback = null) => {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: to,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
    isInteraction: false
  }).start(callback);
};

/**
 * Create a slide-out animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} from - Starting position
 * @param {number} to - Ending position
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const slideOut = (value, from, to, duration = 300, callback = null) => {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: to,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
    isInteraction: false
  }).start(callback);
};

/**
 * Create a scale animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} from - Starting scale
 * @param {number} to - Ending scale
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const scale = (value, from, to, duration = 300, callback = null) => {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: to,
    duration,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true,
    isInteraction: false
  }).start(callback);
};

/**
 * Create a pulse animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} min - Minimum scale
 * @param {number} max - Maximum scale
 * @param {number} duration - Animation duration in milliseconds
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const pulse = (value, min = 0.97, max = 1.03, duration = 1000) => {
  value.setValue(min);
  
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: max,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
        isInteraction: false
      }),
      Animated.timing(value, {
        toValue: min,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
        isInteraction: false
      })
    ])
  ).start();
};

/**
 * Create a bounce animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} from - Starting position
 * @param {number} to - Ending position
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const bounce = (value, from, to, duration = 800, callback = null) => {
  value.setValue(from);
  
  return Animated.sequence([
    Animated.timing(value, {
      toValue: to * 1.2,
      duration: duration * 0.4,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false
    }),
    Animated.timing(value, {
      toValue: to * 0.9,
      duration: duration * 0.2,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false
    }),
    Animated.timing(value, {
      toValue: to * 1.05,
      duration: duration * 0.2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false
    }),
    Animated.timing(value, {
      toValue: to,
      duration: duration * 0.2,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false
    })
  ]).start(callback);
};

/**
 * Create a progress animation
 * 
 * @param {Animated.Value} value - Animated value to animate
 * @param {number} from - Starting progress (0-1)
 * @param {number} to - Ending progress (0-1)
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} callback - Callback function to call when animation completes
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const progress = (value, from, to, duration = 300, callback = null) => {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: to,
    duration,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: false, // Progress animations often affect layout
    isInteraction: false
  }).start(callback);
};

/**
 * Create a staggered animation for a list of items
 * 
 * @param {Array<Animated.Value>} values - Array of animated values to animate
 * @param {number} stagger - Stagger duration in milliseconds
 * @param {number} duration - Animation duration in milliseconds
 * @param {Function} animationCreator - Function that creates an animation for a value
 * @param {Function} callback - Callback function to call when all animations complete
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const stagger = (values, stagger = 50, duration = 300, animationCreator, callback = null) => {
  const animations = values.map((value, i) => {
    return Animated.delay(i * stagger).then(() => animationCreator(value, duration));
  });
  
  return Animated.stagger(stagger, animations).start(callback);
};

/**
 * Create a sequence of animations
 * 
 * @param {Array<Function>} animations - Array of animation functions
 * @param {Function} callback - Callback function to call when all animations complete
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const sequence = (animations, callback = null) => {
  return Animated.sequence(animations.map(anim => anim())).start(callback);
};

/**
 * Create a parallel animation
 * 
 * @param {Array<Function>} animations - Array of animation functions
 * @param {Function} callback - Callback function to call when all animations complete
 * @returns {Animated.CompositeAnimation} - Animation object
 */
export const parallel = (animations, callback = null) => {
  return Animated.parallel(animations.map(anim => anim())).start(callback);
};
