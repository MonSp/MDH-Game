import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

const PRESETS = [
  { label: '🌙 午夜', hour: 0 },
  { label: '🌅 黎明', hour: 6 },
  { label: '☀️ 正午', hour: 12 },
  { label: '🌇 黄昏', hour: 18 },
];

const PERIOD_MAP: { label: string; emoji: string; color: string }[] = [
  { label: '深夜', emoji: '🌙', color: 'text-blue-300' },
  { label: '凌晨', emoji: '🌙', color: 'text-blue-300' },
  { label: '凌晨', emoji: '🌙', color: 'text-blue-300' },
  { label: '凌晨', emoji: '🌙', color: 'text-blue-300' },
  { label: '凌晨', emoji: '🌙', color: 'text-blue-300' },
  { label: '黎明', emoji: '🌅', color: 'text-orange-300' },
  { label: '黎明', emoji: '🌅', color: 'text-orange-300' },
  { label: '上午', emoji: '☀️', color: 'text-amber-300' },
  { label: '上午', emoji: '☀️', color: 'text-amber-300' },
  { label: '上午', emoji: '☀️', color: 'text-amber-300' },
  { label: '上午', emoji: '☀️', color: 'text-amber-300' },
  { label: '上午', emoji: '☀️', color: 'text-amber-300' },
  { label: '正午', emoji: '☀️', color: 'text-yellow-300' },
  { label: '下午', emoji: '☀️', color: 'text-amber-300' },
  { label: '下午', emoji: '☀️', color: 'text-amber-300' },
  { label: '下午', emoji: '☀️', color: 'text-amber-300' },
  { label: '下午', emoji: '☀️', color: 'text-amber-300' },
  { label: '下午', emoji: '☀️', color: 'text-amber-300' },
  { label: '黄昏', emoji: '🌇', color: 'text-orange-300' },
  { label: '黄昏', emoji: '🌇', color: 'text-orange-300' },
  { label: '傍晚', emoji: '🌙', color: 'text-blue-300' },
  { label: '傍晚', emoji: '🌙', color: 'text-blue-300' },
  { label: '深夜', emoji: '🌙', color: 'text-blue-300' },
  { label: '深夜', emoji: '🌙', color: 'text-blue-300' },
];

export const TimeControlPanel = () => {
  const { gameTime, setGameTime, tickGameTime } = useGameStore();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    if (!open) return;
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      if (playingRef.current && delta < 0.5) {
        tickGameTime(delta);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, tickGameTime]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGameTime(parseFloat(e.target.value));
    if (playing) setPlaying(false);
  }, [setGameTime, playing]);

  const handlePreset = useCallback((hour: number) => {
    setGameTime(hour);
    setPlaying(false);
  }, [setGameTime]);

  const togglePlay = useCallback(() => {
    setPlaying(p => !p);
  }, []);

  const period = PERIOD_MAP[Math.min(23, Math.floor(((gameTime % 24) + 24) % 24))];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-4 z-40 w-8 h-8 bg-zinc-900/70 border border-zinc-700/50 rounded-full flex items-center justify-center text-sm hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer"
        title="时间控制"
      >
        🕐
      </button>
    );
  }

  const bgColor = gameTime >= 6 && gameTime < 18
    ? 'from-amber-900/60 to-zinc-900/80'
    : 'from-blue-950/70 to-zinc-900/90';

  return (
    <div className={`absolute top-4 right-4 z-40 bg-gradient-to-b ${bgColor} border border-zinc-700/50 rounded-lg p-3 w-56 shadow-xl backdrop-blur`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${period.color}`}>
          {period.emoji} {period.label}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-zinc-300 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700/50"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <span className={`font-mono text-lg ${period.color}`}>
          {String(Math.floor(gameTime)).padStart(2, '0')}:{String(Math.floor((gameTime % 1) * 60)).padStart(2, '0')}
        </span>
        <button
          onClick={togglePlay}
          className={`text-xs px-2 py-0.5 rounded border transition-all ${
            playing
              ? 'bg-amber-700/60 border-amber-600 text-amber-300'
              : 'bg-zinc-700/60 border-zinc-600 text-zinc-400'
          }`}
        >
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
      </div>

      <div className="relative mb-3">
        <input
          type="range"
          min="0"
          max="23.99"
          step="0.1"
          value={gameTime}
          onChange={handleSliderChange}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              #1a2a4a 0%, #1a2a4a 16%, 
              #3b5998 16%, #3b5998 21%, 
              #ff8c42 21%, #ff8c42 25%, 
              #fff8dc 25%, #fff8dc 29%, 
              #fff8dc 29%, #fff8dc 71%, 
              #ff6b35 71%, #ff6b35 75%, 
              #3b5998 75%, #3b5998 79%, 
              #1a2a4a 79%, #1a2a4a 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
          <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.hour}
            onClick={() => handlePreset(p.hour)}
            className="text-xs py-1 rounded bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition-colors cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
