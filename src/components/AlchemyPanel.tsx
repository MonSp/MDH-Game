import { useState, useMemo } from 'react';
import { CRAFT_RECIPES, attemptCraft, getAvailableRecipes } from '../store/craftingRecipes';
import { useGameStore, getFactionBuildingLevel } from '../store/gameStore';
import { FlaskRound, X } from 'lucide-react';
import { PixelItemIcon } from './PixelItemIcon';
import { PixelPanel } from './PixelPanel';

interface AlchemyPanelProps {
  onClose: () => void;
}

export const AlchemyPanel = ({ onClose }: AlchemyPanelProps) => {
  const player = useGameStore(s => s.player);
  const clans = useGameStore(s => s.clans);
  const playerFactionId = useGameStore(s => s.playerFactionId);
  const addItem = useGameStore(s => s.addItem);
  const removeItem = useGameStore(s => s.removeItem);
  const addLog = useGameStore(s => s.addLog);

  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [craftMessage, setCraftMessage] = useState<string | null>(null);
  const [craftSuccess, setCraftSuccess] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  const inventory = player?.inventory ?? {};

  // 丹房 buff: each level adds 10% effectiveness
  const pillBuffLevel = getFactionBuildingLevel(clans, playerFactionId, '丹房');
  const pillBuffMultiplier = 1 + pillBuffLevel * 0.1;

  const availableRecipes = useMemo(() => {
    return getAvailableRecipes(player?.realm);
  }, [player?.realm]);

  const selected = selectedRecipe ? CRAFT_RECIPES.find(r => r.id === selectedRecipe) : null;

  const handleCraft = () => {
    if (!selected) return;
    const result = attemptCraft(selected, inventory, pillBuffMultiplier);

    if (result.success && result.product) {
      // Consume materials
      for (const [mat, count] of Object.entries(selected.materials)) {
        for (let i = 0; i < count; i++) removeItem(mat);
      }
      // Add product
      addItem(result.product);
      addLog({ type: 'event', message: `[炼丹] ${result.message}` });
    } else {
      // Consume materials anyway (lost on failure)
      for (const [mat, count] of Object.entries(selected.materials)) {
        for (let i = 0; i < count; i++) removeItem(mat);
      }
      addLog({ type: 'event', message: `[炼丹] ${result.message}` });
    }

    setCraftSuccess(result.success);
    setCraftMessage(result.message);
    setShowResult(true);
    setTimeout(() => setShowResult(false), 3000);
  };

  // Material availability check
  const hasMaterials = (recipeId: string) => {
    const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    return Object.entries(recipe.materials).every(
      ([mat, count]) => (inventory[mat] || 0) >= count,
    );
  };

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <PixelPanel className="w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <FlaskRound className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-zinc-100">炼丹炉</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 丹房 buff indicator */}
          {pillBuffLevel > 0 && (
            <div className="p-2 bg-emerald-900/30 border border-emerald-700/40 rounded text-xs text-emerald-400 text-center">
              丹房加持：成功率 +{pillBuffLevel * 10}%
            </div>
          )}

          {/* Recipe list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400">丹方</h3>
            {availableRecipes.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-4">当前境界没有可用的丹方</p>
            ) : (
              availableRecipes.map(recipe => {
                const canCraft = hasMaterials(recipe.id);
                const isSelected = selectedRecipe === recipe.id;
                return (
                  <button
                    key={recipe.id}
                    className={`w-full text-left p-3 rounded-md border transition-all duration-200 min-h-[44px] ${
                      isSelected
                        ? 'bg-emerald-900/60 border-emerald-600/60'
                        : 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
                    }`}
                    onClick={() => { setSelectedRecipe(recipe.id); setCraftMessage(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-zinc-200">{recipe.name}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          recipe.quality === '凡品' ? 'bg-zinc-700 text-zinc-400' :
                          recipe.quality === '灵品' ? 'bg-green-900/50 text-green-400' :
                          recipe.quality === '玄品' ? 'bg-blue-900/50 text-blue-400' :
                          recipe.quality === '地品' ? 'bg-purple-900/50 text-purple-400' :
                          'bg-amber-900/50 text-amber-400'
                        }`}>{recipe.quality}</span>
                      </div>
                      <span className={`text-xs ${canCraft ? 'text-emerald-500' : 'text-red-500'}`}>
                        {canCraft ? '可炼制' : '缺材料'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{recipe.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(recipe.materials).map(([mat, count]) => (
                        <span
                          key={mat}
                          className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                            (inventory[mat] || 0) >= count
                              ? 'bg-zinc-700/50 text-zinc-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          <PixelItemIcon itemName={mat} size={12} />{mat} x{count}
                          <span className="text-zinc-600 ml-0.5">(拥{(inventory[mat] || 0)})</span>
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Craft button */}
          {selected && (
            <div className="pt-2">
              <button
                className={`w-full py-3 rounded-md font-medium transition-all duration-200 min-h-[44px] ${
                  hasMaterials(selected.id)
                    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
                onClick={handleCraft}
                disabled={!hasMaterials(selected.id)}
              >
                {hasMaterials(selected.id)
                  ? `炼制 ${selected.name}（成功率 ${Math.min(Math.round(selected.baseSuccessRate * pillBuffMultiplier * 100), 95)}%）`
                  : '材料不足'}
              </button>

              {/* Result message */}
              {craftMessage && showResult && (
                <div className={`mt-3 p-3 rounded-md text-sm text-center ${
                  craftSuccess
                    ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-400'
                    : 'bg-red-900/30 border border-red-700/50 text-red-400'
                }`}>
                  {craftMessage}
                </div>
              )}
            </div>
          )}

          {/* Material inventory summary */}
          <div className="pt-2 border-t border-zinc-800">
            <h3 className="text-xs font-medium text-zinc-500 mb-2">背包材料</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(inventory)
                .filter(([name, count]) => count > 0 && !['灵石'].includes(name))
                .slice(0, 20)
                .map(([name, count]) => (
                  <span key={name} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded inline-flex items-center gap-0.5">
                    <PixelItemIcon itemName={name} size={12} />{name} x{count}
                  </span>
                ))}
              {Object.keys(inventory).filter(k => k !== '灵石').length === 0 && (
                <p className="text-xs text-zinc-600">背包中没有任何材料</p>
              )}
            </div>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};
