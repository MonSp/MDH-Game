import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { HUD } from '../components/HUD';
import { Map2D } from '../components/Map2D';
import { LogBox } from '../components/LogBox';
import { ChroniclePanel } from '../components/ChroniclePanel';
import { ScenePanel } from '../components/ScenePanel';
import { INTRO_SCENE } from '../content/scenes/intro';
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
};

const NPC_FALLBACK = '……你找我有何事？';
const LLM_TIMEOUT_MS = 15000;

export const Game = () => {
  const navigate = useNavigate();
  const { player, updateNPCs, modifyTalent, markNpcMet, metNpcs } = useGameStore();
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

  // Start scene on mount
  useEffect(() => {
    if (player && !activeScene) {
      setActiveScene(INTRO_SCENE[0]);
      setScenePath([INTRO_SCENE[0].id]);
    }
  }, [player, activeScene]);

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

  const findSceneEntry = useCallback((id: string): SceneEntry | undefined => {
    return INTRO_SCENE.find(s => s.id === id);
  }, []);

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
    }

    // 2. Handle NPC dialogue
    if (choice.npcDialogue) {
      setSceneState('LOADING');
      setDisconnectError(false);
      const npcId = choice.npcDialogue;
      markNpcMet(npcId); // persist NPC memory
      const entry = NPC_DIALOGUE[npcId];
      const alreadyMet = metNpcs.includes(npcId);

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

    // 4. Navigate to next scene entry
    if (choice.nextEntry) {
      const next = INTRO_SCENE.find(s => s.id === choice.nextEntry);
      if (next) {
        // Check if selected choice also has NPC dialogue (e.g., in call_someone)
        const hasNpc = next.choices.find(c => c.npcDialogue);
        if (hasNpc) {
          // The next scene has NPC dialogue — don't auto-proceed
          setActiveScene(next);
          setScenePath(prev => [...prev, next.id]);
        } else {
          setActiveScene(next);
          setScenePath(prev => [...prev, next.id]);
        }
      }
    }
  }, [activeScene, modifyTalent]);

  const handleContinue = useCallback(() => {
    if (!activeScene) return;

    // Find the choice that was selected in the current scene, if it has NPC dialogue
    // After DIALOGUE, check if any choice in this scene has switchToMap
    const switchChoice = activeScene.choices.find(c => c.switchToMap);
    if (switchChoice) {
      setActiveScene(null);
      setScenePath([]);
      setSceneState('CHOOSING');
      setDialogueText(undefined);
      setNpcName(undefined);
      setNpcRole(undefined);
    } else {
      setSceneState('CHOOSING');
      setDialogueText(undefined);
      setNpcName(undefined);
      setNpcRole(undefined);
    }
    clearLlmTimer();
    setDisconnectError(false);
  }, [activeScene, clearLlmTimer]);

  const handleClose = useCallback(() => {
    clearLlmTimer();
    setActiveScene(null);
    setScenePath([]);
    setSceneState('CHOOSING');
    setDialogueText(undefined);
    setNpcName(undefined);
    setNpcRole(undefined);
    setDisconnectError(false);
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
        <Map2D />
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
