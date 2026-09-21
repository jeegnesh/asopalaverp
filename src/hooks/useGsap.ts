import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Custom hook to safely run GSAP animations scoped to a container ref with automatic cleanup
 */
export function useGsapContext<T extends HTMLElement = HTMLDivElement>(
  animationCallback: (context: gsap.Context) => void,
  dependencies: any[] = []
) {
  const containerRef = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      animationCallback(self);
    }, containerRef);

    return () => ctx.revert();
  }, dependencies);

  return containerRef;
}

/**
 * Hook for page transition animation
 */
export function usePageTransition(triggerKey: any) {
  const pageRef = useRef<HTMLDivElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, [triggerKey]);

  return pageRef;
}
