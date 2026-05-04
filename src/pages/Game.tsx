import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { HUD } from '../components/HUD';
import { Map2D } from '../components/Map2D';
import { LogBox } from '../components/LogBox';
import { ChroniclePanel } from '../components/ChroniclePanel';
import { ScenePanel } from '../components/ScenePanel';
import { SurveyPopup } from '../components/SurveyPopup';
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
  const { player, updateNPCs, modifyTalent, markNpcMet, setNpcMemory, addLog, saveToSlot, npcMemory } = useGameStore();
  const [showChronicle, setShowChronicle] = useState(false);

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
      sceneStartedRef.current = false; // reset so re-mount can start intro
    };
  }, []);

  if (!player) return null;

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden font-sans text-zinc-300">
      {/* 2.5D 地图层 */}
      <div className="absolute inset-0 z-0">
        <Map2D onProximityTrigger={handleSceneTrigger} triggerVersion={triggerVersion} />
      </div>

      {/* UI 覆盖层 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <HUD onOpenChronicle={() => setShowChronicle(true)} />
        <LogBox />
        {showChronicle && <ChroniclePanel onClose={() => setShowChronicle(false)} />}
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
    </div>
  );
};
