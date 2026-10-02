// Face crops for the clicker, ordered calm → unhinged.
// Eye coords are fractions of the 512x512 image; used to place flames.
// eyes[0] is the viewer's left; tilt is the eye line in degrees, clockwise positive.
export const FACES = [
  { src: "images/faces/face-01.jpg", eyes: [{ x: 0.47, y: 0.48 }, { x: 0.74, y: 0.51 }], eyeWidth: 0.10, tilt: 6 },
  { src: "images/faces/face-02.jpg", eyes: [{ x: 0.45, y: 0.51 }, { x: 0.71, y: 0.50 }], eyeWidth: 0.10, tilt: -2 },
  { src: "images/faces/face-03.jpg", eyes: [{ x: 0.46, y: 0.44 }, { x: 0.62, y: 0.44 }], eyeWidth: 0.08, tilt: 0 },
  { src: "images/faces/face-04.jpg", eyes: [{ x: 0.43, y: 0.43 }, { x: 0.58, y: 0.43 }], eyeWidth: 0.08, tilt: 0 },
  { src: "images/faces/face-05.jpg", eyes: [{ x: 0.46, y: 0.48 }, { x: 0.63, y: 0.49 }], eyeWidth: 0.09, tilt: 2 },
  { src: "images/faces/face-06.jpg", eyes: [{ x: 0.37, y: 0.46 }, { x: 0.62, y: 0.45 }], eyeWidth: 0.11, tilt: -1 },
  { src: "images/faces/face-07.jpg", eyes: [{ x: 0.40, y: 0.52 }, { x: 0.66, y: 0.49 }], eyeWidth: 0.11, tilt: -7 },
  { src: "images/faces/face-08.jpg", eyes: [{ x: 0.33, y: 0.41 }, { x: 0.58, y: 0.40 }], eyeWidth: 0.11, tilt: -2 },
  { src: "images/faces/face-09.jpg", eyes: [{ x: 0.49, y: 0.47 }, { x: 0.61, y: 0.47 }], eyeWidth: 0.07, tilt: -2 },
];
