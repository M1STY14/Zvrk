declare module '@react-three/fiber';
declare module '@react-three/drei';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
    }
  }
}
