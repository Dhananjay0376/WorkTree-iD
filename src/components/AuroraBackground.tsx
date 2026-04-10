import React, { useEffect, useMemo, useRef, useState } from 'react';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export default function AuroraBackground() {
  const reduced = usePrefersReducedMotion();
  const [pos, setPos] = useState({ x: 50, y: 35 });
  const frameRef = useRef<number | null>(null);
  const nextPosRef = useRef(pos);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      nextPosRef.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };

      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        setPos((current) => {
          const next = nextPosRef.current;
          if (Math.abs(current.x - next.x) < 0.1 && Math.abs(current.y - next.y) < 0.1) {
            return current;
          }
          return next;
        });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [reduced]);

  const style = useMemo(() => {
    // Subtle parallax: move gradients a bit towards cursor.
    const x1 = 18 + (pos.x - 50) * 0.08;
    const y1 = 12 + (pos.y - 35) * 0.08;
    const x2 = 82 + (pos.x - 50) * 0.06;
    const y2 = 20 + (pos.y - 35) * 0.06;
    const x3 = 55 + (pos.x - 50) * 0.05;
    const y3 = 88 + (pos.y - 35) * 0.05;

    return {
      backgroundImage: [
        `radial-gradient(900px 520px at ${x1}% ${y1}%, rgba(99,102,241,0.18), transparent 60%)`,
        `radial-gradient(820px 520px at ${x2}% ${y2}%, rgba(16,185,129,0.13), transparent 62%)`,
        `radial-gradient(900px 620px at ${x3}% ${y3}%, rgba(236,72,153,0.10), transparent 62%)`,
        'linear-gradient(180deg, rgba(3,7,18,0.92), rgba(2,6,23,0.92))',
      ].join(', '),
    } as React.CSSProperties;
  }, [pos.x, pos.y]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0" style={style} />

      {/* soft noise overlay (very subtle) */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.8\"/%3E%3C/svg%3E")',
          backgroundSize: '240px 240px',
        }}
      />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_35%,transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
