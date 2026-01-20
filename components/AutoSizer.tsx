import React, { useEffect, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

interface AutoSizerProps {
  children: (size: Size) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const AutoSizer: React.FC<AutoSizerProps> = ({ children, className = '', style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`w-full h-full overflow-hidden ${className}`} style={style}>
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  );
};