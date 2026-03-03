import { useEffect, useState, type RefObject } from 'react';

type Options = {
  min?: number;
  bottomGap?: number;
  initial?: number;
};

export function useAutoTableHeight(
  ref: RefObject<HTMLElement | null>,
  options: Options = {}
): number {
  const min = options.min ?? 240;
  const bottomGap = options.bottomGap ?? 24;
  const [height, setHeight] = useState(options.initial ?? 520);

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const next = window.innerHeight - rect.top - bottomGap;
      setHeight(Math.max(min, next));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref, min, bottomGap]);

  return height;
}
