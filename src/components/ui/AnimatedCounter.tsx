import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { formatINR } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  isCurrency?: boolean;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 0.5,
  isCurrency = false,
  className = '',
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const startVal = prevValueRef.current;
    const endVal = Number(value) || 0;
    const tracker = { val: startVal };

    const tween = gsap.to(tracker, {
      val: endVal,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (!node) return;
        const currentRounded = Math.round(tracker.val);
        if (isCurrency) {
          node.textContent = formatINR(currentRounded);
        } else {
          node.textContent = `${prefix}${currentRounded.toLocaleString('en-IN')}${suffix}`;
        }
      },
      onComplete: () => {
        prevValueRef.current = endVal;
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, prefix, suffix, duration, isCurrency]);

  return (
    <span ref={nodeRef} className={className}>
      {isCurrency ? formatINR(value) : `${prefix}${value.toLocaleString('en-IN')}${suffix}`}
    </span>
  );
};
