// Register global utility functions
// Map Range works like the map function in p5.js
(function(global) {
  function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  global.mapRange = mapRange;
})(this);