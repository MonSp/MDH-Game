import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { HUD } from '../components/HUD';
import { Map2D } from '../components/Map2D';
import { LogBox } from '../components/LogBox';
import { ChroniclePanel } from '../components/ChroniclePanel';
import { ScenePanel } from '../components/ScenePanel';
import { EventLog } from '../components/EventLog';
import { SurveyPopup } from '../components/SurveyPopup';
import { BlockWorldGameHUD } from '../blockworld/BlockWorldGameHUD';
import { getSceneEntry } from '../content/scenes/sceneRegistry';
import { GRUDGE_NPC_DIALOGUE } from '../content/scenes/grudge/npcDialogue';
import { LI_SI_ID, LI_SI_ROBBED, LI_SI_HELPED } from '../content/scenes/grudge/grudgeScene';
import {
  applyHpEffect,
  applyAddItemEffect,
  applyRemoveItemEffect,
  applyDebuffEffect,
  applyLoseStonesFractionEffect,
  resolveReunionScene,
  shouldTriggerIgnoreDeathRouter,
  resolveRobAdvance,
  createLiSiSquadMember,
  evaluateLiSiPassiveHeal,
} from '../content/scenes/effectUtils';
import { getSocket } from '../shared/socket';
import { type SceneEntry, type ScenePanelState } from '../shared/types/scene';
import { InitiativeService, InitiativeType, type InitiativeEvent } from '../store/gameService';
import type { NPC } from '../store/gameConstants';

// Scripted NPC dialogue responses for fallback when LLM is unavailable
const NPC_DIALOGUE: Record<string, { name: string; role: string; text: string; metText?: string }> = {
  servant_01: {
    name: '小福',
    role: '家族仆从',
    text: '少爷您终于醒了！族长大人已经在正厅等您半天了。\n\n您的衣物已经准备好了，是否需要我为您带路？',
    metText: '少爷，您回来了！族长那边需要我去通报一声吗？',
  },
  servant_02: {
    name: '小环',
    role: '内院丫鬟',
    text: '啊，少爷您醒了！奴婢正要给您送茶呢。\n\n这几日族里为了选拔弟子的事忙得不可开交，族长天天在正厅会客。\n\n对了，昨儿个有位青云宗的执事来访，族长设了晚宴招待。',
    metText: '少爷，您有什么事尽管吩咐。',
  },
  junior_01: {
    name: '林泉',
    role: '族中后辈',
    text: '族兄莫要担心，我看您气息沉稳，不像灵根有损的样子。\n\n依我看啊，那些传言都是三房的人散播的——谁让您是大房的独苗呢。',
    metText: '族兄，您要去正厅了吗？可别让族长等久了。',
  },
  patriarch_01: {
    name: '林震天',
    role: '族长',
    text: '青云宗乃我苍云国第一修仙宗门，立派八百年，门下弟子三千。\n\n现任宗主陆沉渊是元婴中期的大能，座下七峰各有传承。\n\n你此番去，若能拜入其中一峰，便算为我林家争了口气。',
    metText: '该说的我已经说了，你自己斟酌。',
  },
};

const NPC_FALLBACK = '……你找我有何事？';

// Items protected from random removal
const PROTECTED_ITEMS = new Set(['灵石']);

// Merge scripted dialogue with grudge prototype NPCs
const NPC_DIALOGUE_ALL = { ...NPC_DIALOGUE, ...GRUDGE_NPC_DIALOGUE };

const DIALOGUE_TIMEOUT_MS = 15000;

export const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { player, updateNPCs, modifyTalent, markNpcMet, setNpcMemory, addLog, saveToSlot, npcMemory, tickGameTime } = useGameStore();
  const [showChronicle, setShowChronicle] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [blockWorldMode, setBlockWorldMode] = useState(false);

  // Scene state
  const [activeScene, setActiveScene] = useState<SceneEntry | null>(null);
  const [scenePath, setScenePath] = useState<string[]>([]);
  const [sceneState, setSceneState] = useState<ScenePanelState>('CHOOSING');
  const [dialogueText, setDialogueText] = useState<string | undefined>();
  const [npcName, setNpcName] = useState<string | undefined>();
  const [npcRole, setNpcRole] = useState<string | undefined>();
  const [llmError, setLlmError] = useState(false);
  const sceneStartedRef = useRef(false);
  const dialogueResolveRef = useRef<((value: { text: string; name: string; role: string; emotion?: string }) => void) | null>(null);
  const dialogueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNpcIdRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const lastLiSiProtectionRef = useRef(0);
  const [triggerVersion, setTriggerVersion] = useState(0);
  const [showSurvey, setShowSurvey] = useState(false);

  // Phase 1.2: NPC proactive interaction state
  const [initiativeEvents, setInitiativeEvents] = useState<InitiativeEvent[]>([]);
  const [encounterEvent, setEncounterEvent] = useState<InitiativeEvent | null>(null);
  const dismissedEncountersRef = useRef<Set<string>>(new Set());

  // Start scene on mount (one-shot — skip if loading from save)
  useEffect(() => {
    if (player && !sceneStartedRef.current) {
      sceneStartedRef.current = true;
      if (location.state?.fromSave) return; // loading a save, skip intro
      const first = getSceneEntry('wake_up');
      if (first) {
        setActiveScene(first);
        setScenePath([first.id]);
      }
    }
  }, [player, location.state?.fromSave]);

  // Coordinate proximity → trigger scene (e.g., walk to family compound)
  const handleSceneTrigger = useCallback((sceneId: string) => {
    if (activeScene) return; // don't stack scenes

    // 宿怨 Phase 2: memory-aware routing
    if (sceneId === 'grudge_reunion_router') {
      const memory = useGameStore.getState().npcMemory[LI_SI_ID];
      const targetId = resolveReunionScene(memory);
      if (!targetId) return;
      const entry = getSceneEntry(targetId);
      if (!entry) return;
      setActiveScene(entry);
      setScenePath(['grudge_reunion']);
      setSceneState('CHOOSING');
      return;
    }

    // 宿怨: ignore → death rumor (only fires when LI_SI_IGNORED)
    if (sceneId === 'grudge_ignore_death_router') {
      const memory = useGameStore.getState().npcMemory[LI_SI_ID];
      if (!shouldTriggerIgnoreDeathRouter(memory)) return;
      const entry = getSceneEntry('grudge_lisi_death_rumor');
      if (!entry) return;
      setActiveScene(entry);
      setScenePath(['grudge_lisi_death_rumor']);
      setSceneState('CHOOSING');
      return;
    }

    const entry = getSceneEntry(sceneId);
    if (!entry) return;
    setActiveScene(entry);
    setScenePath([entry.id]);
    setSceneState('CHOOSING');
  }, [activeScene]);

  // NPC自治演化 + 自动存档
  useEffect(() => {
    if (!player) {
      navigate('/');
      return;
    }
    const npcInterval = setInterval(() => {
      updateNPCs();
      useGameStore.getState().tickGameTime(1);

      // Li Si passive protection: when in squad and HP < 20%, auto-heal once per 30s
      const s = useGameStore.getState();
      if (s.player) {
        const decision = evaluateLiSiPassiveHeal(s.player, s.squadMembers, lastLiSiProtectionRef.current, Date.now());
        if (decision) {
          lastLiSiProtectionRef.current = Date.now();
          useGameStore.setState({
            player: {
              ...s.player,
              stats: { ...s.player.stats, hp: Math.min(s.player.stats.maxHp, s.player.stats.hp + decision.healAmount) }
            }
          });
          s.addLog({ type: 'event', message: `李四奋力挡在你身前！你感到一股暖流涌入体内（+${decision.healAmount} HP）` });
        }
      }
    }, 1000);

    // Auto-save every 60 seconds
    const saveInterval = setInterval(() => {
      saveToSlot(0);
    }, 60000);

    return () => { clearInterval(npcInterval); clearInterval(saveInterval); };
  }, [player, navigate, updateNPCs, saveToSlot]);

  // Socket.IO listener for scene:npc-response
  useEffect(() => {
    const socket = getSocket();

    const handler = (data: { npcId: string; name: string; role: string; text: string; emotion?: string }) => {
      // Guard: ignore stale responses for a different NPC
      if (data.npcId !== pendingNpcIdRef.current) return;
      if (dialogueTimeoutRef.current) {
        clearTimeout(dialogueTimeoutRef.current);
        dialogueTimeoutRef.current = null;
      }
      if (dialogueResolveRef.current) {
        dialogueResolveRef.current({ text: data.text, name: data.name, role: data.role, emotion: data.emotion });
        dialogueResolveRef.current = null;
      }
    };
    socket.on('scene:npc-response', handler);

    return () => {
      socket.off('scene:npc-response', handler);
    };
  }, []);

  // Socket.IO listener for NPC interaction events (Phase 1.3)
  useEffect(() => {
    const socket = getSocket();

    const handler = (data: { interactions: Array<{ type: string; npcNameA: string; npcNameB: string; description: string; timestamp: number }> }) => {
      const { addWorldEvent } = useGameStore.getState();
      for (const ev of data.interactions) {
        addWorldEvent({
          type: ev.type as any,
          npcNameA: ev.npcNameA,
          npcNameB: ev.npcNameB,
          description: ev.description,
          timestamp: ev.timestamp,
        });
      }
    };
    socket.on('npc:interactions', handler);

    return () => {
      socket.off('npc:interactions', handler);
    };
  }, []);

  // Socket.IO listener for npc:state-sync (Phase 1.1d — server NPC state → client)
  useEffect(() => {
    const socket = getSocket();

    const handler = (data: { npcStates: any[]; tick: number }) => {
      const { mergeServerNPCs } = useGameStore.getState();
      const mapped: NPC[] = data.npcStates.map(s => ({
        id: s.id,
        clanId: s.clanId || 'unknown',
        name: s.name,
        role: s.role,
        realm: s.realm,
        power: s.power,
        hp: s.hp,
        maxHp: s.maxHp,
        mp: s.mp ?? Math.floor(s.power * 5),
        maxMp: s.maxMp ?? Math.floor(s.power * 5),
        personality: {
          ambition: s.ambition ?? 50,
          caution: s.caution ?? 50,
          loyalty: s.loyalty ?? 50,
          greed: s.greed ?? 50,
        },
        resources: { spiritStone: s.spiritStone ?? 0 },
        activity: s.activity,
        position: { x: s.x, y: s.y },
      }));
      mergeServerNPCs(mapped);
    };
    socket.on('npc:state-sync', handler);

    return () => {
      socket.off('npc:state-sync', handler);
    };
  }, []);

  // Socket.IO listener for faction:ai-decision-result (Phase 1.4a)
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { clanId: string; decision: { targetClanId: string; action: 'war' | 'alliance' | 'truce' | 'none'; reason: string } | null }) => {
      useGameStore.getState().resolveFactionAI(data.clanId, data.decision);
    };
    socket.on('faction:ai-decision-result', handler);

    return () => {
      socket.off('faction:ai-decision-result', handler);
    };
  }, []);

  const handleChoice = useCallback(async (choiceIndex: number) => {
    if (!activeScene) return;
    const choice = activeScene.choices[choiceIndex];
    if (!choice) return;

    // Guard against rapid clicks while a dialogue request is in flight
    if (processingRef.current) return;
    processingRef.current = true;
    try {

    // 1. Apply effects
    if (choice.effect) {
      if (choice.effect.talent) {
        modifyTalent(choice.effect.talent);
      }
      if (choice.effect.cultivation) {
        const store = useGameStore.getState();
        if (store.player) {
          const newExp = store.player.stats.exp + choice.effect.cultivation;
          useGameStore.setState({
            player: {
              ...store.player,
              stats: { ...store.player.stats, exp: Math.max(0, newExp) }
            }
          });
          addLog({ type: 'event', message: `修为 ${choice.effect.cultivation >= 0 ? '+' : ''}${choice.effect.cultivation}` });
        }
      }
      if (choice.effect.spiritStone) {
        const store = useGameStore.getState();
        if (store.player) {
          const inventory = { ...store.player.inventory };
          inventory['灵石'] = (inventory['灵石'] || 0) + choice.effect.spiritStone;
          useGameStore.setState({ player: { ...store.player, inventory } });
          addLog({ type: 'event', message: `灵石 ${choice.effect.spiritStone >= 0 ? '+' : ''}${choice.effect.spiritStone}` });
        }
      }
      if (choice.effect.reputation) {
        const store = useGameStore.getState();
        if (!store.player) return;
        for (const [faction, delta] of Object.entries(choice.effect.reputation)) {
          if (faction === 'family') {
            const clanIndex = store.clans.findIndex(c => c.id === store.player!.clanId);
            if (clanIndex !== -1) {
              const clans = [...store.clans];
              clans[clanIndex] = {
                ...clans[clanIndex],
                reputation: Math.max(0, Math.min(100, clans[clanIndex].reputation + delta))
              };
              useGameStore.setState({ clans });
              addLog({ type: 'system', message: `家族好感度 ${delta >= 0 ? '+' : ''}${delta}` });
            }
          }
        }
      }
      if (choice.effect.hp) {
        const store = useGameStore.getState();
        if (store.player) {
          const result = applyHpEffect(store.player, choice.effect.hp);
          useGameStore.setState({ player: { ...store.player, ...result.player, stats: { ...store.player.stats, ...result.player.stats } } });
          result.logs.forEach(msg => addLog({ type: 'event' as const, message: msg }));
        }
      }
      if (choice.effect.addItem) {
        const store = useGameStore.getState();
        if (store.player) {
          const result = applyAddItemEffect(store.player, choice.effect.addItem);
          useGameStore.setState({ player: { ...store.player, inventory: result.player.inventory } });
          result.logs.forEach(msg => addLog({ type: 'event' as const, message: msg }));
        }
      }
      if (choice.effect.removeItem) {
        const store = useGameStore.getState();
        if (store.player) {
          const result = applyRemoveItemEffect(store.player, choice.effect.removeItem.count, { protectedItems: PROTECTED_ITEMS });
          useGameStore.setState({ player: { ...store.player, inventory: result.player.inventory } });
          result.logs.forEach(msg => addLog({ type: 'system' as const, message: msg }));
        }
      }
      if (choice.effect.setMemory) {
        setNpcMemory(choice.effect.setMemory.npcId, choice.effect.setMemory.value);
      }
      if (choice.effect.debuff) {
        const store = useGameStore.getState();
        if (store.player) {
          const result = applyDebuffEffect(store.player, choice.effect.debuff);
          useGameStore.setState({ player: { ...store.player, ...result.player } });
          result.logs.forEach(msg => addLog({ type: 'system' as const, message: msg }));
        }
      }
      if (choice.effect.loseStonesFraction !== undefined) {
        const store = useGameStore.getState();
        if (store.player) {
          const result = applyLoseStonesFractionEffect(store.player, choice.effect.loseStonesFraction);
          if (result.player.inventory) {
            useGameStore.setState({ player: { ...store.player, inventory: result.player.inventory } });
          }
          result.logs.forEach(msg => addLog({ type: 'system' as const, message: msg }));
        }
      }
    }

    // 2. Handle NPC dialogue
    if (choice.npcDialogue) {
      setSceneState('LOADING');
      const npcId = choice.npcDialogue;
      pendingNpcIdRef.current = npcId;
      markNpcMet(npcId); // persist NPC memory

      // 宿怨 prototype: set NPC memory based on dialogue outcome
      if (npcId === 'grudge_lisi_robbed') {
        setNpcMemory(LI_SI_ID, LI_SI_ROBBED);
      } else if (npcId === 'grudge_lisi_give_back' || npcId === 'grudge_lisi_help_ask') {
        setNpcMemory(LI_SI_ID, LI_SI_HELPED);
      }

      // Try LLM dialogue via socket
      try {
        const socket = getSocket();
        const dialoguePromise = new Promise<{ text: string; name: string; role: string; emotion?: string }>((resolve) => {
          dialogueResolveRef.current = resolve;
        });

        socket.emit('scene:npc-dialogue', {
          npcId,
          sceneContext: choice.sceneContext || undefined,
        });

        const result = await Promise.race([
          dialoguePromise,
          new Promise<null>((_, reject) => {
            dialogueTimeoutRef.current = setTimeout(() => reject(new Error('timeout')), DIALOGUE_TIMEOUT_MS);
          }),
        ]);

        if (result) {
          setNpcName(result.name);
          setNpcRole(result.role);
          setDialogueText(result.text);
          setSceneState('DIALOGUE');
        }
      } catch {
        // LLM timeout or socket error — show fallback option
        setLlmError(true);
        pendingNpcIdRef.current = null;
      }
      return;
    }

    // 3. Switch to map
    if (choice.switchToMap) {
      setActiveScene(null);
      setScenePath([]);
      setSceneState('CHOOSING');
      return;
    }

    // 4. Navigate to next scene entry (via registry)
    if (choice.nextEntry) {
      // 宿怨 Phase 2: Li Si joins squad when entering the consequence scene
      if (choice.nextEntry === 'grudge_joined_squad') {
        const store = useGameStore.getState();
        if (store.player && !store.squadMembers.some(m => m.npcId === LI_SI_ID)) {
          const newMember = createLiSiSquadMember(store.player);
          useGameStore.setState({ squadMembers: [...store.squadMembers, newMember] });
          store.addLog({ type: 'event', message: '【入队】李四加入了你的队伍！' });
        }
      }
      const next = getSceneEntry(choice.nextEntry);
      if (next) {
        setActiveScene(next);
        setScenePath(prev => [...prev, next.id]);
      }
    }
    } finally {
      processingRef.current = false;
    }
  }, [activeScene, modifyTalent]);

  const handleContinue = useCallback(() => {
    if (!activeScene) return;

    // Log dialogue before closing
    if (dialogueText && npcName) {
      addLog({ type: 'system', message: `[${npcName}] ${dialogueText}` });
    }

    // 宿怨: auto-advance out of grudge_lisi_rob after memory is set
    if (activeScene.id === 'grudge_lisi_rob') {
      const memory = useGameStore.getState().npcMemory[LI_SI_ID];
      const nextId = resolveRobAdvance(memory);
      if (nextId) {
        const next = getSceneEntry(nextId);
        if (next) {
          setActiveScene(next);
          setScenePath(prev => [...prev, next.id]);
          setSceneState('CHOOSING');
          setDialogueText(undefined);
          setNpcName(undefined);
          setNpcRole(undefined);
          setLlmError(false);
          return;
        }
      }
    }

    // After DIALOGUE, check if any choice in this scene has switchToMap
    const switchChoice = activeScene.choices.find(c => c.switchToMap);
    if (switchChoice) {
      setActiveScene(null);
      setScenePath([]);
      setSceneState('CHOOSING');
      setDialogueText(undefined);
      setNpcName(undefined);
      setNpcRole(undefined);
      setTriggerVersion(v => v + 1);
    } else {
      setSceneState('CHOOSING');
      setDialogueText(undefined);
      setNpcName(undefined);
      setNpcRole(undefined);
    }
    setLlmError(false);
  }, [activeScene, dialogueText, npcName, addLog]);

  const handleClose = useCallback(() => {
    if (dialogueTimeoutRef.current) {
      clearTimeout(dialogueTimeoutRef.current);
      dialogueTimeoutRef.current = null;
    }
    dialogueResolveRef.current = null;
    setActiveScene(null);
    setScenePath([]);
    setSceneState('CHOOSING');
    setDialogueText(undefined);
    setNpcName(undefined);
    setNpcRole(undefined);
    setLlmError(false);
    setTriggerVersion(v => v + 1);
  }, []);

  const handleFallback = useCallback(() => {
    const npcId = pendingNpcIdRef.current;
    const entry = npcId ? NPC_DIALOGUE_ALL[npcId] : null;
    if (entry) {
      setNpcName(entry.name);
      setNpcRole(entry.role);
      setDialogueText(entry.text);
    } else {
      setNpcName(npcId || '未知');
      setNpcRole('未知');
      setDialogueText(NPC_FALLBACK);
    }
    setSceneState('DIALOGUE');
    setLlmError(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dialogueTimeoutRef.current) {
        clearTimeout(dialogueTimeoutRef.current);
        dialogueTimeoutRef.current = null;
      }
      dialogueResolveRef.current = null;
      sceneStartedRef.current = false;
    };
  }, []);

  // Phase 1.2: Poll NPC initiative service every 2s
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      const s = useGameStore.getState();
      if (!s.player) return;

      const service = InitiativeService.getInstance();
      service.tick(s.player.position, s.nearbyNPCs);
      const pending = service.getPendingEvents();
      setInitiativeEvents(pending);

      // Auto-open new encounter events
      for (const e of pending) {
        if (e.type === InitiativeType.ENCOUNTER && !dismissedEncountersRef.current.has(e.id)) {
          setEncounterEvent(e);
          break;
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [player]);

  // Phase 1.4a: Poll faction AI decisions every 15s
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      const s = useGameStore.getState();
      if (!s.player) return;

      const aiClans = s.clans.filter(c =>
        c.id !== s.playerFactionId && (c.treasury || 0) >= 100
      );
      const now = Date.now();
      const socket = getSocket();

      for (const clan of aiClans) {
        // Skip if in cooldown
        const cooldown = s._factionLLMCooldowns[clan.id];
        if (cooldown && now < cooldown) continue;
        // Skip if already awaiting LLM response
        if (s._factionLLMQueue.includes(clan.id)) continue;

        // Build other clans context
        const otherClans = s.clans
          .filter(o => o.id !== clan.id && !o.isAscendingFamily)
          .map(o => ({
            id: o.id,
            name: o.name,
            reputation: o.reputation,
            treasury: o.treasury || 0,
            type: o.type || 'unknown',
            currentStatus: (() => {
              const entry = clan.diplomacy?.[o.id];
              return entry?.status || '中立';
            })(),
          }));

        if (otherClans.length === 0) continue;

        // Mark as queued and emit
        s.enqueueFactionAI(clan.id);
        socket.emit('faction:ai-decision', {
          clanId: clan.id,
          clanName: clan.name,
          clanType: clan.type || 'unknown',
          clanReputation: clan.reputation,
          clanTreasury: clan.treasury || 0,
          otherClans,
        });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [player]);

  // Auto-dequeue stale faction AI queue entries after 30s
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      const s = useGameStore.getState();
      if (s._factionLLMQueue.length === 0) return;
      const staleCutoff = Date.now() - 30000;
      for (const id of s._factionLLMQueue) {
        const enqueuedAt = s._factionLLMEnqueueTime[id];
        if (enqueuedAt && enqueuedAt < staleCutoff) {
          s.clearStaleFactionAI(id);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [player]);

  // Phase 1.2: Handle encounter event choice
  const handleEncounterChoice = useCallback((event: InitiativeEvent, choiceIndex: number) => {
    const service = InitiativeService.getInstance();
    const result = service.resolveEncounter(event.id, choiceIndex);
    if (!result) return;

    const store = useGameStore.getState();
    if (store.player) {
      if (result.stonesDelta !== 0) {
        const inventory = { ...store.player.inventory };
        inventory['灵石'] = (inventory['灵石'] || 0) + result.stonesDelta;
        useGameStore.setState({ player: { ...store.player, inventory } });
      }
      if (result.expDelta !== 0) {
        const newExp = Math.max(0, store.player.stats.exp + result.expDelta);
        useGameStore.setState({
          player: { ...store.player, stats: { ...store.player.stats, exp: Math.min(newExp, store.player.stats.maxExp) } }
        });
      }
      store.addLog({ type: 'event', message: result.log });
    }

    dismissedEncountersRef.current.add(event.id);
    setEncounterEvent(null);
    setInitiativeEvents(service.getPendingEvents());
  }, []);

  // Dismiss a single initiative event
  const dismissInitiativeEvent = useCallback((eventId: string) => {
    const service = InitiativeService.getInstance();
    service.dismissEvent(eventId);
    setInitiativeEvents(service.getPendingEvents());
  }, []);

  if (!player) return null;

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-300">
      {/* 2.5D 地图层 */}
      <div className="absolute inset-0 z-0">
        <Map2D onProximityTrigger={handleSceneTrigger} triggerVersion={triggerVersion} onBlockWorldToggle={(active) => setBlockWorldMode(active)} />
      </div>

      {/* UI 覆盖层 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {!blockWorldMode ? <HUD onOpenChronicle={() => setShowChronicle(true)} /> : <BlockWorldGameHUD />}
        <LogBox />
        {showChronicle && <ChroniclePanel onClose={() => setShowChronicle(false)} />}
        <EventLog isOpen={showEventLog} onToggle={() => setShowEventLog(v => !v)} />

        {/* Phase 1.2: NPC initiative notification banners */}
        {!activeScene && initiativeEvents.filter(e => e.type !== InitiativeType.ENCOUNTER).length > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col space-y-2 w-full max-w-md pointer-events-auto">
            {initiativeEvents
              .filter(e => e.type !== InitiativeType.ENCOUNTER)
              .slice(-2)
              .map(event => (
                <div
                  key={event.id}
                  className="bg-zinc-900/95 border border-zinc-700/80 rounded-lg px-4 py-3 shadow-2xl animate-fadeIn"
                  style={{ animation: 'fadeIn 0.3s ease-out' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-emerald-400">
                          {event.type === InitiativeType.GREETING ? '搭话' :
                           event.type === InitiativeType.TRADE_OFFER ? '交易' :
                           event.type === InitiativeType.CHALLENGE ? '挑衅' : '求助'}
                        </span>
                        {event.npcName && (
                          <span className="text-xs text-zinc-400">
                            {event.npcName}{event.npcRole ? `(${event.npcRole})` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-200 leading-relaxed">{event.message}</p>
                    </div>
                    <button
                      onClick={() => dismissInitiativeEvent(event.id)}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 text-lg leading-none"
                      aria-label="关闭"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 宿怨原型调查 */}
      {showSurvey && <SurveyPopup onClose={() => setShowSurvey(false)} />}

      {/* 场景叙事层 */}
      {activeScene && (
        <ScenePanel
          scene={activeScene}
          scenePath={scenePath}
          state={sceneState}
          dialogueText={dialogueText}
          npcName={npcName}
          npcRole={npcRole}
          llmError={llmError}
          onChoice={handleChoice}
          onContinue={handleContinue}
          onClose={handleClose}
          onFallback={handleFallback}
          npcMemory={npcMemory}
        />
      )}

      {/* Phase 1.2: Encounter event popup */}
      {encounterEvent && !activeScene && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
          aria-label="路遇事件"
        >
          <div
            className="w-full max-w-md mx-4 bg-zinc-900/95 border border-zinc-700 rounded-lg p-6 shadow-2xl"
            style={{ animation: 'fadeIn 0.3s ease-out' }}
          >
            <h2 className="text-xl font-serif text-emerald-400 tracking-wide text-center mb-4">
              路遇事件
            </h2>
            <p className="text-zinc-200 leading-relaxed mb-6 whitespace-pre-line">
              {encounterEvent.message}
            </p>
            <div className="space-y-2">
              {encounterEvent.encounterChoices?.map((choice, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 rounded-md border transition-all duration-200
                    bg-emerald-900/80 border-amber-700/60 text-amber-200
                    hover:bg-emerald-800 hover:border-amber-500 hover:text-amber-100
                    active:bg-emerald-700 text-sm font-medium min-h-[44px]"
                  onClick={() => handleEncounterChoice(encounterEvent, i)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => { dismissedEncountersRef.current.add(encounterEvent.id); setEncounterEvent(null); }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors text-sm"
              >
                忽略
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
