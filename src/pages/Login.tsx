import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getSaveSlots as getSaveSlotsDirect, loadGame as loadGameDirect } from '../store/saveManager';
import type { SaveSlotInfo } from '../store/saveManager';
import { LogIn, Server, Save, Trash2, Play } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { servers, joinServer, loadFromSlot, deleteSaveSlot } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [loadError, setLoadError] = useState('');
  const [hasAutoSave, setHasAutoSave] = useState(false);

  useEffect(() => {
    setSaveSlots(getSaveSlotsDirect());
    setHasAutoSave(loadGameDirect(0) !== null);
  }, []);

  const handleJoin = async () => {
    if (!selectedServer) return;
    const server = servers.find(s => s.id === selectedServer);
    if (server && server.playerCount >= 100) {
      alert('该区已满，请选择其他服务器或等待开新区！');
      return;
    }
    await joinServer(selectedServer, playerName || '无名修士');
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 背景修饰 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=pixel%20art%20chinese%20xianxia%20landscape%20mountains%20mist%20dark%20theme&image_size=landscape_16_9')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent"></div>
      </div>

      <div className="z-10 bg-zinc-900/80 p-8 rounded-lg border border-zinc-800 shadow-2xl backdrop-blur-sm max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-400 mb-2 tracking-widest" style={{ fontFamily: 'serif' }}>太古纪元</h1>
          <p className="text-zinc-500 text-sm">2.5D像素风玄幻修仙世界</p>
        </div>

        {/* 继续游戏 / 读档 */}
        {(hasAutoSave || saveSlots.some(s => s.meta)) && (
          <div className="mb-6">
            {hasAutoSave && (
              <button
                onClick={() => {
                  setLoadError('');
                  const ok = loadFromSlot(0);
                  if (ok) navigate('/game', { state: { fromSave: true } });
                  else setLoadError('读取存档失败');
                }}
                className="w-full flex items-center justify-center space-x-2 p-3 mb-3 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded transition-all text-emerald-300 font-medium"
              >
                <Play size={16} />
                <span>继续游戏</span>
              </button>
            )}

            <h2 className="text-sm font-medium text-zinc-400 mb-2 flex items-center">
              <Save size={14} className="mr-1" />读档
            </h2>
            <div className="space-y-2">
              {saveSlots.filter(s => s.meta).map(slot => (
                <div
                  key={slot.slot}
                  className="flex items-center justify-between p-3 bg-zinc-800/80 border border-zinc-700 rounded cursor-pointer hover:bg-zinc-700 hover:border-emerald-700 transition-all"
                  onClick={() => {
                    setLoadError('');
                    const ok = loadFromSlot(slot.slot);
                    if (ok) navigate('/game', { state: { fromSave: true } });
                    else setLoadError('读取存档失败');
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/50 flex items-center justify-center text-emerald-400 text-sm font-bold">
                      {slot.slot}
                    </div>
                    <div>
                      <div className="text-zinc-200 text-sm font-medium">{slot.meta!.playerName}</div>
                      <div className="text-zinc-500 text-xs">
                        {slot.meta!.playerRealm} · 第{slot.meta!.heavenLevel}层天 · {new Date(slot.meta!.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSaveSlot(slot.slot); setSaveSlots(getSaveSlotsDirect()); }}
                    className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                    title="删除存档"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {loadError && (
              <p className="text-red-400 text-xs mt-2">{loadError}</p>
            )}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <h2 className="text-sm font-medium text-zinc-400 mb-2">新建游戏</h2>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">道号</label>
            <input
              type="text"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="请输入你的道号..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">选择仙域</label>
            <div className="space-y-2">
              {servers.map(server => (
                <button
                  key={server.id}
                  onClick={() => setSelectedServer(server.id)}
                  className={`w-full flex items-center justify-between p-3 rounded border transition-all ${
                    selectedServer === server.id 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                      : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Server size={18} className={selectedServer === server.id ? 'text-emerald-500' : 'text-zinc-500'} />
                    <span className="font-medium">{server.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-zinc-500">{server.playerCount}/100 人</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      server.status === '爆满' ? 'bg-red-500/20 text-red-400' :
                      server.status === '拥挤' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {server.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={!selectedServer}
            className="w-full py-3 mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded flex items-center justify-center space-x-2 transition-colors"
          >
            <LogIn size={20} />
            <span>踏入仙途</span>
          </button>
        </div>
      </div>
    </div>
  );
};
