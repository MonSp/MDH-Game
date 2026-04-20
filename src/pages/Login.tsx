import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { LogIn, Server } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { servers, joinServer } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  const handleJoin = () => {
    if (!selectedServer) return;
    const server = servers.find(s => s.id === selectedServer);
    if (server && server.playerCount >= 100) {
      alert('该区已满，请选择其他服务器或等待开新区！');
      return;
    }
    joinServer(selectedServer, playerName || '无名修士');
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
