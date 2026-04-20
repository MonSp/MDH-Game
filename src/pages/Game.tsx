import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { HUD } from '../components/HUD';
import { Map2D } from '../components/Map2D';
import { LogBox } from '../components/LogBox';

export const Game = () => {
  const navigate = useNavigate();
  const { player, updateNPCs } = useGameStore();

  useEffect(() => {
    if (!player) {
      navigate('/');
      return;
    }
    
    // 启动后台NPC自治演化模拟
    const interval = setInterval(() => {
      updateNPCs();
    }, 1000);

    return () => clearInterval(interval);
  }, [player, navigate, updateNPCs]);

  if (!player) return null;

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-300">
      {/* 2.5D 地图层 */}
      <div className="absolute inset-0 z-0">
        <Map2D />
      </div>

      {/* UI 覆盖层 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <HUD />
        <LogBox />
      </div>
    </div>
  );
};
