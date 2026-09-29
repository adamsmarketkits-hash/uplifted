"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FitnessIcon } from "@/components/fitness-icon";
import { formatVolume } from "@/lib/week";

const COLORS = ["#d4af37", "#f3e2a9", "#e6c65c", "#e3e8ef", "#c5cdd8"];

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const pieces = Array.from({ length: 90 }, () => ({
      x: canvas.width * (0.15 + Math.random() * 0.7),
      y: -20 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 8,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 7,
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    }));

    const started = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const piece of pieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.12;
        piece.spin += piece.spinSpeed;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.spin);
        context.fillStyle = piece.color;
        context.globalAlpha = Math.max(0, 1 - (now - started) / 1700);
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (now - started < 1700) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    />
  );
}

export function FinishCelebration({
  name,
  volume,
  beatLastTime,
  showStrong,
}: {
  name: string;
  volume: number;
  beatLastTime: boolean;
  showStrong: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setTimeout(() => router.push("/family"), 1800);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950 px-6">
      <ConfettiBurst />
      <div className="relative z-[70] flex max-w-sm flex-col items-center text-center">
        {showStrong && <FitnessIcon look="strong" className="mb-4 h-28 w-28" />}
        <h2 className="text-4xl font-semibold">Nice work.</h2>
        <p className="mt-3 text-lg text-gold-200">
          {name} · {formatVolume(volume)} lb
        </p>
        {beatLastTime && <p className="mt-2 text-silver-300">You beat last time.</p>}
      </div>
    </div>
  );
}
