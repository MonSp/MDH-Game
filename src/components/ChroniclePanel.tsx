import { useEffect, useRef, useState, useCallback } from 'react';
import { PixelPanel } from './PixelPanel';

let globalIdCounter = 0;

interface NPCEntry {
  id: string;
  name: string;
  role: string;
  activity: string;
  emotion: string;
}

interface ChronicleEntry {
  id: number;
  timestamp: number;
  time: string;
  npcName: string;
  npcId: string;
  action: string;
  type: string;
}

interface RecruitCandidate {
  id: string;
  name: string;
  desc: string;
  trait: string;
}

const ROLE_LABELS: Record<string, string> = {
  elder: '长老',
  core_disciple: '核心弟子',
  inner_disciple: '内门弟子',
  branch_disciple: '外门弟子',
};

const ACTIVITY_LABELS: Record<string, string> = {
  cultivate: '修炼', patrol: '巡逻', rest: '休息',
  train: '练功', socialize: '社交', scheme: '谋划',
  request: '请求', task: '执行任务',
};

const TYPE_COLORS: Record<string, string> = {
  system: '#fa8',
  reaction: '#8f8',
  relationship: '#f80',
  morale: '#4af',
  notice: '#f44',
  status: '#a8f',
  ambient: '#888',
  order: '#fa0',
  player_action: '#8af',
};

const TYPE_LABELS: Record<string, string> = {
  system: '宗门',
  reaction: '反应',
  relationship: '关系',
  morale: '士气',
  notice: '通知',
  status: '状态',
  ambient: '日常',
  order: '指令',
  player_action: '掌门',
};

const ALL_TYPES = ['system', 'reaction', 'relationship', 'morale', 'notice', 'status', 'ambient', 'order', 'player_action'];

export const ChroniclePanel = ({ onClose }: { onClose: () => void }) => {
  const [npcs, setNpcs] = useState<NPCEntry[]>([]);
  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showRecruit, setShowRecruit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showPromote, setShowPromote] = useState<string | null>(null);
  const [promoteNpcId, setPromoteNpcId] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [npcFilter, setNpcFilter] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<RecruitCandidate[]>([]);
  const chronicleRef = useRef<HTMLDivElement>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Connect to chronicle WebSocket with auto-reconnect
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectAttempts = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/chronicle`);

      ws.onopen = () => {
        if (disposed) { ws.close(); return; }
        setWsConnected(true);
        reconnectAttempts = 0;
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'chronicle:event') {
            const ts = msg.event.timestamp || Date.now();
            const time = new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
            globalIdCounter++;
            setChronicle(prev => [...prev.slice(-200), {
              id: globalIdCounter,
              timestamp: ts,
              time,
              npcName: msg.event.npcName,
              npcId: msg.event.npcId,
              action: msg.event.action,
              type: msg.event.type || 'ambient',
            }]);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (disposed) return;
        // Reconnect with backoff: 1s, 2s, 4s, 8s, max 16s
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000);
        reconnectAttempts++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      ws.close();
    };
  }, []);

  // Fetch NPC list periodically
  const fetchNPCs = useCallback(() => {
    fetch('/api/npcs').then(r => r.json()).then(setNpcs).catch(() => console.warn('[ChroniclePanel] Failed to fetch NPC list'));
  }, []);

  useEffect(() => {
    fetchNPCs();
    const interval = setInterval(fetchNPCs, 5000);
    return () => clearInterval(interval);
  }, [fetchNPCs]);

  // Fetch recruit candidates
  useEffect(() => {
    fetch('/api/recruit/candidates').then(r => r.json()).then(setCandidates).catch(() => {});
  }, []);

  // Auto-scroll chronicle
  useEffect(() => {
    if (chronicleRef.current) {
      chronicleRef.current.scrollTop = chronicleRef.current.scrollHeight;
    }
  }, [chronicle]);

  const doAction = async (url: string, body: any) => {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowRecruit(false);
    setShowAssign(false);
    setShowPromote(null);
    fetchNPCs();
  };

  const filtered = npcs.filter(n =>
    n.name.includes(search) || (ROLE_LABELS[n.role] || n.role).includes(search)
  );

  const filteredChronicle = chronicle.filter(e =>
    (typeFilter ? e.type === typeFilter : true) &&
    (npcFilter ? e.npcId === npcFilter : true)
  );

  // Group events into time buckets
  const now = Date.now();
  const groups = groupByTime(filteredChronicle, now);

  const borderColor = (t: string) => {
    const m: Record<string, string> = {
      relationship: '#f80', system: '#fa0', reaction: '#4c4',
      morale: '#4af', notice: '#f44', status: '#a8f',
    };
    return m[t] || '#2a2a3e';
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex z-50" onClick={onClose}>
      <PixelPanel className="mx-auto my-8 w-[1200px] max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} contentClassName="flex flex-1 min-h-0">
        {/* Left: NPC List */}
        <div className="w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col">
          <div className="p-3 border-b border-zinc-800 text-center text-sm text-zinc-500">
            宗门成员 ({npcs.length})
          </div>
          <input
            className="m-3 p-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300"
            placeholder="搜索弟子..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex-1 overflow-y-auto">
            {filtered.map(n => (
              <div key={n.id} className={`px-3 py-2 flex justify-between items-center hover:bg-zinc-800/50 text-sm border-b border-zinc-800/30 cursor-pointer ${npcFilter === n.id ? 'bg-zinc-800/60 border-l-2 border-l-blue-500' : ''}`}
                   onClick={() => setNpcFilter(npcFilter === n.id ? null : n.id)}>
                <div>
                  <span className="text-blue-300 font-medium">{n.name}</span>
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {ROLE_LABELS[n.role] || n.role}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {ACTIVITY_LABELS[n.activity] || n.activity || '—'}
                  <span className="ml-1" style={{ color: emotionColor(n.emotion) }}>·{n.emotion}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 text-center text-xs text-zinc-600 border-t border-zinc-800 flex justify-between px-3">
            <span>显示 {filtered.length} / {npcs.length} 人</span>
            {npcFilter && <button className="text-blue-500 hover:underline" onClick={() => setNpcFilter(null)}>清除筛选</button>}
          </div>
        </div>

        {/* Right: Chronicle + Actions */}
        <div className="flex-1 flex flex-col">
          {/* Action Bar */}
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex gap-2 flex-wrap">
            <button className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/70 border border-purple-700/50 rounded text-sm text-zinc-200" onClick={() => setShowRecruit(true)}>
              招募弟子
            </button>
            <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-zinc-200" onClick={() => setShowAssign(true)}>
              分配任务
            </button>
            <button className="px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/70 border border-emerald-700/50 rounded text-sm text-zinc-200" onClick={() => { setPromoteNpcId(npcs[0]?.id || ''); setShowPromote('promote'); }}>
              提拔
            </button>
            <button className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/70 border border-red-700/50 rounded text-sm text-zinc-200" onClick={() => { setPromoteNpcId(npcs[0]?.id || ''); setShowPromote('demote'); }}>
              贬斥
            </button>
            <button className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/70 border border-amber-700/50 rounded text-sm text-zinc-200" onClick={() => doAction('/api/ceremony', { type: '祭祀' })}>
              祭祀
            </button>
            <button className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800/70 border border-amber-700/50 rounded text-sm text-zinc-200" onClick={() => doAction('/api/ceremony', { type: '庆典' })}>
              庆典
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-2 bg-zinc-950/80 border-b border-zinc-800 flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-zinc-500 mr-1">筛选:</span>
            <button className={`text-xs px-2 py-1 rounded ${!typeFilter ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    onClick={() => setTypeFilter(null)}>全部</button>
            {ALL_TYPES.map(t => (
              <button key={t}
                className={`text-xs px-2 py-1 rounded ${typeFilter === t ? 'text-zinc-200' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                style={{ backgroundColor: typeFilter === t ? (TYPE_COLORS[t] || '#666') + '40' : undefined, borderColor: typeFilter === t ? TYPE_COLORS[t] : undefined, borderWidth: typeFilter === t ? 1 : 0 }}
                onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                {TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 px-4 py-1 bg-zinc-950/40 border-b border-zinc-800">
            <span className={`inline-block w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-zinc-500">{wsConnected ? '已连接' : '已断开，重连中...'}</span>
          </div>

          {/* Chronicle Feed */}
          <div ref={chronicleRef} className="flex-1 overflow-y-auto px-4 py-2 bg-zinc-900/50">
            {filteredChronicle.length === 0 && (
              <div className="text-zinc-600 text-sm text-center mt-20">暂无事件</div>
            )}
            {groups.map(group => (
              <div key={group.label}>
                <div className="text-xs text-zinc-600 sticky top-0 bg-zinc-900/90 py-2 font-medium">{group.label}</div>
                {group.entries.map(e => (
                  <div key={e.id} className="py-1.5 px-2 mb-0.5 text-sm border-l-2 hover:bg-zinc-800/30 transition-colors flex items-start gap-2"
                       style={{ borderLeftColor: borderColor(e.type) }}>
                    <span className="text-zinc-600 text-xs shrink-0 mt-0.5 w-14 text-right">{e.time}</span>
                    <span className="text-xs shrink-0 mt-0.5 px-1 rounded" style={{ color: TYPE_COLORS[e.type] || '#888', backgroundColor: (TYPE_COLORS[e.type] || '#888') + '20' }}>
                      {TYPE_LABELS[e.type] || e.type}
                    </span>
                    <span className="font-medium shrink-0" style={{ color: npcColor(e.npcId) }}>[{e.npcName}]</span>
                    <span className="text-zinc-300">{e.action}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Modals */}
        {showRecruit && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" onClick={() => setShowRecruit(false)}>
            <PixelPanel className="p-6 w-[500px]" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-purple-300 mb-4">招募新弟子</h3>
              <div className="flex gap-3 mb-4">
                {candidates.length === 0 ? (
                  <div className="text-zinc-500 text-sm p-4">暂无可用候选人</div>
                ) : (
                  candidates.map(c => (
                    <div key={c.id} className="flex-1 p-4 bg-zinc-800 border border-zinc-700 rounded cursor-pointer hover:border-blue-500 text-center transition-colors"
                         onClick={() => doAction('/api/recruit', { candidate: c.id })}>
                      <div className="text-lg text-blue-300 font-medium mb-1">{c.name}</div>
                      <div className="text-xs text-zinc-400 mb-1">{c.desc}</div>
                      <span className="inline-block px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded">{c.trait}</span>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-zinc-300" onClick={() => setShowRecruit(false)}>取消</button>
            </PixelPanel>
          </div>
        )}

        {showAssign && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" onClick={() => setShowAssign(false)}>
            <PixelPanel className="p-6 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-zinc-200 mb-4">分配任务</h3>
              <AssignForm npcs={npcs} onAssign={(npcId, task) => doAction('/api/assign', { npcId, task })} onCancel={() => setShowAssign(false)} />
            </PixelPanel>
          </div>
        )}

        {showPromote && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" onClick={() => setShowPromote(null)}>
            <PixelPanel className="p-6 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4" style={{ color: showPromote === 'promote' ? '#4c4' : '#f44' }}>
                {showPromote === 'promote' ? '提拔弟子' : '贬斥弟子'}
              </h3>
              <select className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 mb-4"
                value={promoteNpcId} onChange={e => setPromoteNpcId(e.target.value)}>
                {npcs.map(n => (
                  <option key={n.id} value={n.id}>{n.name}（{ROLE_LABELS[n.role] || n.role}）</option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mb-4">{showPromote === 'demote' ? '此决定可能引发严重不满。' : '提拔该弟子，其他人会有不同反应。'}</p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-zinc-300" onClick={() => setShowPromote(null)}>取消</button>
                <button className="flex-1 py-2 rounded text-sm font-medium"
                  style={{ backgroundColor: showPromote === 'promote' ? '#065f46' : '#7f1d1d', color: '#fff' }}
                  onClick={() => doAction('/api/promote', { npcId: promoteNpcId, action: showPromote })}>
                  {showPromote === 'promote' ? '提拔' : '贬斥'}
                </button>
              </div>
            </PixelPanel>
          </div>
        )}
      </PixelPanel>
    </div>
  );
};

function AssignForm({ npcs, onAssign, onCancel }: { npcs: NPCEntry[]; onAssign: (id: string, task: string) => void; onCancel: () => void }) {
  const [npcId, setNpcId] = useState(npcs[0]?.id || '');
  const [task, setTask] = useState('');
  return (
    <>
      <select className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 mb-3" value={npcId} onChange={e => setNpcId(e.target.value)}>
        {npcs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>
      <input className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 mb-3" placeholder="任务描述，如：去后山采集药材" value={task} onChange={e => setTask(e.target.value)} />
      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-zinc-300" onClick={onCancel}>取消</button>
        <button className="flex-1 py-2 bg-blue-900/50 hover:bg-blue-800/70 border border-blue-700/50 rounded text-sm text-zinc-200" onClick={() => onAssign(npcId, task || '执行日常任务')}>下达</button>
      </div>
    </>
  );
}

/** Group entries by time buckets. */
function groupByTime(entries: ChronicleEntry[], now: number): { label: string; entries: ChronicleEntry[] }[] {
  const ONE_MIN = 60000;
  const ONE_HOUR = 3600000;
  const groups: { label: string; entries: ChronicleEntry[] }[] = [];
  let recent: ChronicleEntry[] = [];
  let thisHour: ChronicleEntry[] = [];
  let older: ChronicleEntry[] = [];

  for (const e of entries) {
    const age = now - e.timestamp;
    if (age < ONE_MIN) recent.push(e);
    else if (age < ONE_HOUR) thisHour.push(e);
    else older.push(e);
  }

  if (recent.length) groups.push({ label: '最近', entries: recent });
  if (thisHour.length) groups.push({ label: '本小时', entries: thisHour });
  if (older.length) groups.push({ label: '更早', entries: older });
  return groups.length ? groups : [{ label: '全部', entries }];
}

function npcColor(npcId: string): string {
  if (npcId === 'system') return '#fa8';
  const colors = ['#8af', '#f8a', '#af8', '#fa8', '#a8f', '#8fa', '#f88', '#88f'];
  const hash = npcId.split('_').pop() || '0';
  return colors[parseInt(hash) % colors.length] || '#8af';
}

function emotionColor(em: string): string {
  if (!em) return '#666';
  if (em.includes('怒') || em.includes('恨') || em.includes('不满')) return '#f44';
  if (em.includes('喜') || em.includes('悦') || em.includes('平静')) return '#4c4';
  if (em.includes('忧') || em.includes('惧') || em.includes('不安')) return '#a8f';
  return '#888';
}
