import { useEffect, useRef, useState } from 'react';
import { PixelPanel } from './PixelPanel';
import { getSocket } from '../shared/socket';

let globalId = 0;

interface RumorEntry {
  id: number;
  timestamp: number;
  time: string;
  fromName: string;
  toName: string;
  text: string;
  type: 'message' | 'activity' | 'chronicle';
}

const TYPE_ICON: Record<string, string> = {
  message: '💬',
  activity: '⚡',
  chronicle: '📜',
};

const NPC_COLORS = ['#8af', '#f8a', '#af8', '#fa8', '#a8f', '#8fa', '#f88', '#88f', '#fda', '#adf'];

function npcColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return NPC_COLORS[Math.abs(hash) % NPC_COLORS.length];
}

export const RumorPanel = ({ onClose }: { onClose: () => void }) => {
  const [entries, setEntries] = useState<RumorEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Chronicle WebSocket — listen for kernel_message events
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${window.location.host}/chronicle`);

      ws.onopen = () => { if (!disposed) { setConnected(true); attempts = 0; } };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'chronicle:event') {
            const evt = msg.event;
            // Filter: only show kernel messages and NPC-related events
            if (evt.type === 'kernel_message' || evt.type === 'kernel_tick' || evt.type === 'kernel_effect') {
              const ts = evt.timestamp || Date.now();
              globalId++;
              setEntries(prev => [...prev.slice(-300), {
                id: globalId,
                timestamp: ts,
                time: new Date(ts).toLocaleTimeString('zh-CN', { hour12: false }),
                fromName: evt.npcName || '???',
                toName: '',
                text: evt.action || evt.description || '',
                type: evt.type === 'kernel_message' ? 'message' : 'activity',
              }]);
            }
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setConnected(false);
        if (disposed) return;
        const delay = Math.min(1000 * Math.pow(2, attempts), 16000);
        attempts++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => { disposed = true; clearTimeout(reconnectTimer); ws?.close(); };
  }, []);

  // 2. Socket.IO — listen for npc:interactions
  useEffect(() => {
    const socket = getSocket();

    function onInteractions(data: { interactions: Array<{
      npcNameA: string; npcNameB: string; description: string; timestamp: number; type: string;
    }>; tick: number }) {
      if (!data.interactions?.length) return;
      for (const inter of data.interactions) {
        // Only show greet/socialize interactions (kernel messages)
        if (inter.type === 'greet' || inter.type === 'socialize') {
          const ts = inter.timestamp || Date.now();
          globalId++;
          setEntries(prev => [...prev.slice(-300), {
            id: globalId,
            timestamp: ts,
            time: new Date(ts).toLocaleTimeString('zh-CN', { hour12: false }),
            fromName: inter.npcNameA,
            toName: inter.npcNameB,
            text: inter.description,
            type: 'message',
          }]);
        }
      }
    }

    socket.on('npc:interactions', onInteractions);
    return () => { socket.off('npc:interactions', onInteractions); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="absolute bottom-4 right-4 z-40 w-[420px] max-h-[500px]">
      <PixelPanel title="江湖传闻" titleColor="text-amber-400" className="flex flex-col max-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/40 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-zinc-500">{connected ? '已连接' : '断线'}</span>
            <span className="text-xs text-zinc-600 ml-2">{entries.length} 条</span>
          </div>
          <button
            className="text-zinc-500 hover:text-zinc-300 text-sm px-2 py-0.5 rounded hover:bg-zinc-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 bg-zinc-900/50 min-h-[200px] max-h-[420px]">
          {entries.length === 0 && (
            <div className="text-zinc-600 text-sm text-center mt-12">
              <div className="text-2xl mb-2">🏮</div>
              暂无传闻...
              <div className="text-xs text-zinc-700 mt-1">NPC 之间的对话将在此显示</div>
            </div>
          )}
          {entries.map(e => (
            <div key={e.id} className="mb-2 last:mb-0">
              <div className="flex items-start gap-2">
                {/* Icon */}
                <span className="text-xs mt-0.5 shrink-0">{TYPE_ICON[e.type]}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header line */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-zinc-600 shrink-0">{e.time}</span>
                    <span className="font-medium text-sm shrink-0" style={{ color: npcColor(e.fromName) }}>
                      {e.fromName}
                    </span>
                    {e.toName && (
                      <>
                        <span className="text-zinc-600 text-xs">→</span>
                        <span className="font-medium text-sm shrink-0" style={{ color: npcColor(e.toName) }}>
                          {e.toName}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Message text */}
                  <div className="text-sm text-zinc-300 pl-0 leading-relaxed">
                    {e.text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>
    </div>
  );
};
