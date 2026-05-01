import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { HUD } from '../components/HUD';
import { Map2D } from '../components/Map2D';
import { LogBox } from '../components/LogBox';
import { ChroniclePanel } from '../components/ChroniclePanel';
import { ScenePanel } from '../components/ScenePanel';
import { getSceneEntry } from '../content/scenes/sceneRegistry';
import type { SceneEntry, ScenePanelState } from '../shared/types/scene';

// Scripted NPC dialogue responses for intro scene (D5: scripted intro)
// Supports "already met" variant when NPC has been encountered before
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
    text: '啊，少爷您醒了！奴婢正要给您送茶呢。\n\n\'这几日族里为了选拔弟子的事忙得不可开交，族长天天在正厅会客。\n\n对了，昨儿个有位青云宗的执事来访，族长设了晚宴招待。',
    metText: '少爷，您有什么事尽管吩咐。',
  },
  junior_01: {
    name: '林泉',
    role: '族中后辈',
    text: '族兄莫要担心，我看您气息沉稳，不像灵根有损的样子。\n\n\'依我看啊，那些传言都是三房的人散播的——谁让您是大房的独苗呢。',
    metText: '族兄，您要去正厅了吗？可别让族长等久了。',
  },
  patriarch_01: {
    name: '林震天',
    role: '族长',
    text: '青云宗乃我苍云国第一修仙宗门，立派八百年，门下弟子三千。\n\n\'现任宗主陆沉渊是元婴中期的大能，座下七峰各有传承。\n\n你此番去，若能拜入其中一峰，便算为我林家争了口气。',
    metText: '该说的我已经说了，你自己斟酌。',
  },
};

const NPC_FALLBACK = '……你找我有何事？';

export const Game = () => {
  const navigate = useNavigate();
  const { player, updateNPCs, modifyTalent, markNpcMet, addLog } = useGameStore();
  const [showChronicle, setShowChronicle] = useState(false);

  // Scene state
  const [activeScene, setActiveScene] = useState<SceneEntry | null>(null);
  const [scenePath, setScenePath] = useState<string[]>([]);
  const [sceneState, setSceneState] = useState<ScenePanelState>('CHOOSING');
  const [dialogueText, setDialogueText] = useState<string | undefined>();
  const [npcName, setNpcName] = useState<string | undefined>();
  const [npcRole, setNpcRole] = useState<string | undefined>();
  const [disconnectError, setDisconnectError] = useState(false);
  const llmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneStartedRef = useRef(false);
  const [triggerVersion, setTriggerVersion] = useState(0);

  // Start scene on mount (one-shot — do not re-trigger on close)
  useEffect(() => {
    if (player && !sceneStartedRef.current) {
      sceneStartedRef.current = true;
      const first = getSceneEntry('wake_up');
      if (first) {
        setActiveScene(first);
        setScenePath([first.id]);
      }
    }
  }, [player]);

  // Coordinate proximity → trigger scene (e.g., walk to family compound)
  const handleSceneTrigger = useCallback((sceneId: string) => {
    if (activeScene) return; // don't stack scenes
    const entry = getSceneEntry(sceneId);
    if (!entry) return;
    setActiveScene(entry);
    setScenePath([entry.id]);
    setSceneState('CHOOSING');
  }, [activeScene]);

  // NPC自治演化
  useEffect(() => {
    if (!player) {
      navigate('/');
      return;
    }
    const interval = setInterval(() => {
      updateNPCs();
    }, 1000);
    return () => clearInterval(interval);
  }, [player, navigate, updateNPCs]);

  const clearLlmTimer = useCallback(() => {
    if (llmTimerRef.current) {
      clearTimeout(llmTimerRef.current);
      llmTimerRef.current = null;
    }
  }, []);

  const handleChoice = useCallback((choiceIndex: number) => {
    if (!activeScene) return;
    const choice = activeScene.choices[choiceIndex];
    if (!choice) return;

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
    }

    // 2. Handle NPC dialogue
    if (choice.npcDialogue) {
      setSceneState('LOADING');
      setDisconnectError(false);
      const npcId = choice.npcDialogue;
      markNpcMet(npcId); // persist NPC memory
      const entry = NPC_DIALOGUE[npcId];
      const alreadyMet = useGameStore.getState().metNpcs.includes(npcId);

      if (entry) {
        // Scripted response with simulated delay for consistency
        llmTimerRef.current = setTimeout(() => {
          setNpcName(entry.name);
          setNpcRole(entry.role);
          setDialogueText(alreadyMet && entry.metText ? entry.metText : entry.text);
          setSceneState('DIALOGUE');
        }, 800);
      } else {
        // Fallback for unknown NPC
        llmTimerRef.current = setTimeout(() => {
          setNpcName(npcId);
          setNpcRole('未知');
          setDialogueText(NPC_FALLBACK);
          setSceneState('DIALOGUE');
        }, 800);
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
      const next = getSceneEntry(choice.nextEntry);
      if (next) {
        setActiveScene(next);
        setScenePath(prev => [...prev, next.id]);
      }
    }
  }, [activeScene, modifyTalent]);

  const handleContinue = useCallback(() => {
    if (!activeScene) return;

    // Log dialogue before closing
    if (dialogueText && npcName) {
      addLog({ type: 'system', message: `[${npcName}] ${dialogueText}` });
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
    clearLlmTimer();
    setDisconnectError(false);
  }, [activeScene, dialogueText, npcName, addLog, clearLlmTimer]);

  const handleClose = useCallback(() => {
    clearLlmTimer();
    setActiveScene(null);
    setScenePath([]);
    setSceneState('CHOOSING');
    setDialogueText(undefined);
    setNpcName(undefined);
    setNpcRole(undefined);
    setDisconnectError(false);
    setTriggerVersion(v => v + 1);
  }, [clearLlmTimer]);

  const handleFallback = useCallback(() => {
    setNpcName('小福');
    setNpcRole('家族仆从');
    setDialogueText('少爷，您醒了就好。族长在正厅等您。');
    setSceneState('DIALOGUE');
    setDisconnectError(false);
    clearLlmTimer();
  }, [clearLlmTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearLlmTimer();
  }, [clearLlmTimer]);

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

      {/* 场景叙事层 */}
      {activeScene && (
        <ScenePanel
          scene={activeScene}
          scenePath={scenePath}
          state={sceneState}
          dialogueText={dialogueText}
          npcName={npcName}
          npcRole={npcRole}
          disconnectError={disconnectError}
          onChoice={handleChoice}
          onContinue={handleContinue}
          onClose={handleClose}
          onFallback={handleFallback}
        />
      )}
    </div>
  );
};
