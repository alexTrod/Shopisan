import { PixelRatio, Dimensions } from 'react-native';

/**
 * Utility functions for handling font scaling and responsive design
 */

// Get the device's font scale factor
export const getFontScale = () => {
  return PixelRatio.getFontScale();
};

// Check if device has large text enabled
export const isLargeTextEnabled = () => {
  return getFontScale() > 1.0;
};

// Get responsive font size that adapts to system font scaling
export const getResponsiveFontSize = (baseSize) => {
  const fontScale = getFontScale();
  const { width, height } = Dimensions.get('window');
  
  // Base calculation using screen dimensions
  const responsiveSize = (height / 100) * baseSize;
  
  // Apply font scaling but limit it to prevent extreme sizes
  const scaledSize = responsiveSize * fontScale;
  
  // Limit the maximum scale to prevent UI breaking
  const maxScale = 1.5;
  const minScale = 0.8;
  
  return Math.max(
    minScale * responsiveSize,
    Math.min(scaledSize, maxScale * responsiveSize)
  );
};

// Get responsive dimensions that account for font scaling
export const getResponsiveDimensions = (baseValue, isHeight = false) => {
  const fontScale = getFontScale();
  const { width, height } = Dimensions.get('window');
  
  // Base calculation
  const baseDimension = isHeight ? height : width;
  const responsiveValue = (baseDimension / 100) * baseValue;
  
  // Apply font scaling with limits
  const maxScale = 1.3;
  const minScale = 0.9;
  
  return Math.max(
    minScale * responsiveValue,
    Math.min(responsiveValue * fontScale, maxScale * responsiveValue)
  );
};

// Common responsive font sizes
export const FontSizes = {
  tiny: getResponsiveFontSize(1.2),
  small: getResponsiveFontSize(1.6),
  medium: getResponsiveFontSize(2.0),
  large: getResponsiveFontSize(2.4),
  xlarge: getResponsiveFontSize(3.0),
  xxlarge: getResponsiveFontSize(3.6),
};

// Common responsive spacing
export const Spacing = {
  tiny: getResponsiveDimensions(0.5),
  small: getResponsiveDimensions(1),
  medium: getResponsiveDimensions(2),
  large: getResponsiveDimensions(3),
  xlarge: getResponsiveDimensions(4),
  xxlarge: getResponsiveDimensions(5),
};
