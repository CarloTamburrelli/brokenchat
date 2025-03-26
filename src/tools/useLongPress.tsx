import { useCallback, useRef, useState } from "react";

interface UseLongPressOptions {
  shouldPreventDefault?: boolean;
  delay?: number;
}

type LongPressEvent = React.MouseEvent | React.TouchEvent;
type LongPressCallback = (event: LongPressEvent, id: string | number) => void;

const useLongPress = (
  onLongPress: LongPressCallback,
  { shouldPreventDefault = true, 
    delay = 400 
  }: UseLongPressOptions = {}
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: LongPressEvent, id: string | number) => {

      if (shouldPreventDefault && event.target) {

        if ((event.target as HTMLElement).tagName.toLowerCase() === "a") {
          return;
        }

        (event.target as HTMLElement).addEventListener("touchend", preventDefault, {
          passive: false,
        });
        target.current = event.target;
      }

      timeout.current = setTimeout(() => {
        onLongPress(event, id);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: LongPressEvent) => {
      if (timeout.current) clearTimeout(timeout.current);
      setLongPressTriggered(false);

      if (shouldPreventDefault && target.current) {
        (target.current as HTMLElement).removeEventListener("touchend", preventDefault);
      }
    },
    [shouldPreventDefault]
  );

  return (id: string | number) => ({
    onMouseDown: (e: LongPressEvent) => start(e, id),
    onTouchStart: (e: LongPressEvent) => start(e, id),
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  });
};

const isTouchEvent = (event: any): event is TouchEvent => {
  return "touches" in event;
};

const preventDefault = (event: Event) => {
  if (!isTouchEvent(event)) return;
  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};

export default useLongPress;
