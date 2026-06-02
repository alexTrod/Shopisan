import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as ImageManipulator from "expo-image-manipulator";
import styles from "./styles";

/**
 * ImageEditor - Pinch-to-zoom + finger-rotation image editor
 * @param {Object} props
 * @param {string} props.imageUri - Source image URI from picker
 * @param {Function} props.onDone - Called with edited image URI
 * @param {Function} props.onCancel - Cancel handler
 * @param {number} [props.outputSize=800] - Output square size in pixels
 * @param {Function} props.t - Translation function
 */
const ImageEditor = ({ imageUri, onDone, onCancel, outputSize = 800, t }) => {
  const { width: screenWidth } = useWindowDimensions();
  const VIEWPORT_SIZE = screenWidth * 0.75;

  const [processing, setProcessing] = useState(false);

  // Transform shared values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Saved values for gesture continuation
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Focal point for pinch
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Pinch gesture for scaling
  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      "worklet";
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onUpdate((e) => {
      "worklet";
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      "worklet";
      savedScale.value = scale.value;
      // Spring back if too small
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  // Rotation gesture
  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      "worklet";
    })
    .onUpdate((e) => {
      "worklet";
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      "worklet";
      savedRotation.value = rotation.value;
    });

  // Pan gesture for repositioning (single finger only, 2 fingers = pinch/rotate)
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      "worklet";
    })
    .onUpdate((e) => {
      "worklet";
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      "worklet";
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Compose: pinch+rotation together, pan separate (pan needs 1 finger, pinch/rotate need 2)
  const pinchRotate = Gesture.Simultaneous(pinchGesture, rotationGesture);
  const composedGesture = Gesture.Simultaneous(pinchRotate, panGesture);

  // Animated style for image transforms
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  // Reset transforms
  const handleReset = useCallback(() => {
    scale.value = withSpring(1);
    rotation.value = withSpring(0);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedRotation.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // Process and export final image
  const handleDone = async () => {
    setProcessing(true);

    try {
      // Get current transform values
      const currentRotation = rotation.value;
      const currentScale = scale.value;
      const currentTranslateX = translateX.value;
      const currentTranslateY = translateY.value;

      // Convert rotation from radians to degrees
      const rotationDegrees = (currentRotation * 180) / Math.PI;

      // For simplicity, we'll apply rotation and then crop to center square
      // A more complex implementation would account for scale and pan
      const actions = [];

      // Apply rotation if significant
      if (Math.abs(rotationDegrees) > 0.5) {
        actions.push({ rotate: rotationDegrees });
      }

      // Get image dimensions to calculate crop
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const imgWidth = imageInfo.width;
      const imgHeight = imageInfo.height;

      // Calculate the crop region for a square centered on transforms
      // This is a simplified approach - full implementation would need more math
      const minDim = Math.min(imgWidth, imgHeight);
      const cropSize = minDim / currentScale;
      const actualCropSize = Math.min(cropSize, minDim);

      // Calculate offset based on pan
      const panRatioX = currentTranslateX / VIEWPORT_SIZE;
      const panRatioY = currentTranslateY / VIEWPORT_SIZE;

      const centerX = imgWidth / 2;
      const centerY = imgHeight / 2;

      // Offset from center based on pan (inverted because moving image right means crop left)
      const offsetX = -panRatioX * actualCropSize;
      const offsetY = -panRatioY * actualCropSize;

      const originX = Math.max(
        0,
        Math.min(
          centerX - actualCropSize / 2 + offsetX,
          imgWidth - actualCropSize,
        ),
      );
      const originY = Math.max(
        0,
        Math.min(
          centerY - actualCropSize / 2 + offsetY,
          imgHeight - actualCropSize,
        ),
      );

      actions.push({
        crop: {
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.round(actualCropSize),
          height: Math.round(actualCropSize),
        },
      });

      // Resize to output size
      actions.push({
        resize: {
          width: outputSize,
          height: outputSize,
        },
      });

      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      onDone(result.uri);
    } catch (error) {
      console.error("Image manipulation error:", error);
      // Fall back to original image if manipulation fails
      onDone(imageUri);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Editor area */}
      <View style={styles.editorArea}>
        <View
          style={[
            styles.viewport,
            { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE },
          ]}
        >
          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[
                { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE },
                animatedImageStyle,
              ]}
            >
              <Animated.Image
                source={{ uri: imageUri }}
                style={[
                  styles.image,
                  { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE },
                ]}
                resizeMode="cover"
              />
            </Animated.View>
          </GestureDetector>
          {/* Square overlay mask */}
          <View style={styles.overlayMask} pointerEvents="none">
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View
                style={[
                  styles.cropArea,
                  { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE },
                ]}
              />
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          {t?.("imageEditor.instructions") ||
            "Pinch to zoom, rotate with two fingers, drag to position"}
        </Text>

        {/* Reset button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>
            {t?.("imageEditor.reset") || "Reset"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={processing}
        >
          <Text style={styles.cancelButtonText}>
            {t?.("imageEditor.cancel") || t?.("cancel") || "Cancel"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.doneButton,
            processing && styles.disabledButton,
          ]}
          onPress={handleDone}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.doneButtonText}>
              {t?.("imageEditor.done") || t?.("done") || "Done"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
};

export default ImageEditor;
