// Register global utility functions
// Map Range works like the map function in p5.js
export function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax - inMin === 0) {
      console.warn('mapRange: Zero division error. Check input range.');
      return outMin; // Default to outMin to avoid Infinity
  }
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}