import * as Cesium from 'cesium';

/**
 * Set camera to Austin on load with a cinematic fly-in.
 * @returns {Function} Cancels the pending or active startup flight.
 */
export function flyToAustin(viewer) {
  // Start looking down at Austin Texas State Capitol & street grid
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-97.7419, 30.2715, 850),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-75),
      roll: 0.0,
    },
  });

  // Smooth cinematic glide to street-level satellite altitude (280m)
  const timer = setTimeout(() => {
    if (viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.7419, 30.2715, 280),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-70),
        roll: 0.0,
      },
      duration: 2.8,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 400);

  return () => {
    clearTimeout(timer);
    if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
  };
}
