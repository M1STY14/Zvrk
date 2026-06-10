declare module '@react-three/fiber';
declare module '@react-three/drei';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: {
        object: unknown;
        scale?: number | [number, number, number];
        position?: [number, number, number];
        rotation?: [number, number, number];
        [key: string]: unknown;
      };
    }
  }
}
