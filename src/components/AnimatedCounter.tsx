import React, { useEffect, useState, useRef } from 'react';

interface Props {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (val: number) => string;
}

export const AnimatedCounter: React.FC<Props> = ({
  value,
  duration = 750,
  className = '',
  formatter = (v) => (typeof v === 'number' && !isNaN(v) ? v.toLocaleString() : '0')
}) => {
  const safeEndValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeEndValue);
  const startValueRef = useRef<number>(safeEndValue);
  const startTimeRef = useRef<number | null>(null);
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = displayValue;
    const endVal = safeEndValue;
    startValueRef.current = startVal;
    startTimeRef.current = null;

    if (startVal === endVal) {
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      // Ease out cubic: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        reqIdRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    reqIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (reqIdRef.current) {
        cancelAnimationFrame(reqIdRef.current);
      }
    };
  }, [safeEndValue, duration]);

  return <span className={`tabular-nums ${className}`}>{formatter(displayValue)}</span>;
};

export default AnimatedCounter;
