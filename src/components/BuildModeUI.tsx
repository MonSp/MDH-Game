import React, { useState, useCallback } from 'react';
import { useBuildModeStore } from '../buildings/BuildModeStore';
import { MATERIAL_DISPLAY } from '../buildings/BuildingItems';
import { saveBlueprint, loadBlueprint, listBlueprints, exportAsTS, importFromJSON } from '../buildings/BlueprintManager';
import type { BlueprintMeta } from '../buildings/BlueprintManager';

export const BuildModeUI: React.FC = () => {
  const { active, selectedMaterial, currentLayer, currentBuild, setMaterial, setLayer, loadVoxels, clearBuild, deactivateBuildMode, getAvailableCount } = useBuildModeStore();

  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showLoadList, setShowLoadList] = useState(false);
  const [blueprints, setBlueprints] = useState<BlueprintMeta[]>([]);
  const [showImportInput, setShowImportInput] = useState(false);
  const [importText, setImportText] = useState('');
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleSaveBlueprint = useCallback(() => {
    if (!currentBuild) return;
    if (!saveName.trim()) return;
    const existing = loadBlueprint(saveName.trim());
    if (existing) {
      if (!window.confirm(`Blueprint "${saveName.trim()}" already exists. Overwrite?`)) return;
    }
    saveBlueprint(saveName.trim(), currentBuild.voxels);
    setShowSaveInput(false);
    setSaveName('');
    showToast(`Blueprint "${saveName.trim()}" saved`);
  }, [currentBuild, saveName, showToast]);

  const handleLoadBlueprint = useCallback((name: string) => {
    const grid = loadBlueprint(name);
    if (grid) {
      loadVoxels(grid);
      setShowLoadList(false);
      showToast(`Blueprint "${name}" loaded`);
    } else {
      showToast('Failed to load blueprint');
    }
  }, [loadVoxels, showToast]);

  const openLoadList = useCallback(() => {
    setBlueprints(listBlueprints());
    setShowLoadList(true);
  }, []);

  const handleExportCode = useCallback(() => {
    if (!currentBuild) return;
    const code = exportAsTS(currentBuild.voxels);
    navigator.clipboard.writeText(code).then(() => {
      showToast('Code copied to clipboard');
    }).catch(() => {
      showToast('Failed to copy code');
    });
  }, [currentBuild, showToast]);

  const handleImportJSON = useCallback(() => {
    if (!importText.trim()) return;
    try {
      const grid = importFromJSON(importText.trim());
      loadVoxels(grid);
      setShowImportInput(false);
      setImportText('');
      showToast('Blueprint imported');
    } catch (e: any) {
      showToast(e.message || 'Import failed');
    }
  }, [importText, loadVoxels, showToast]);

  const handleClearBuild = useCallback(() => {
    if (window.confirm('Clear all voxels? This cannot be undone.')) {
      clearBuild();
      showToast('Build cleared');
    }
  }, [clearBuild, showToast]);

  if (!active || !currentBuild) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-50 px-4 py-2 bg-gray-800 border border-gray-600 rounded shadow-lg text-white text-sm">
          {toast}
        </div>
      )}

      {/* Material hotbar - bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-600 rounded-lg px-4 py-3 backdrop-blur">
          {MATERIAL_DISPLAY.map((mat) => {
            const count = getAvailableCount(mat.type);
            const isOutOfStock = count <= 0;
            return (
              <button
                key={mat.type}
                onClick={() => !isOutOfStock && setMaterial(mat.type)}
                disabled={isOutOfStock}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded transition-colors ${
                  selectedMaterial === mat.type
                    ? 'ring-2 ring-white bg-gray-600'
                    : isOutOfStock
                      ? 'bg-gray-800 opacity-40 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <span
                  className="inline-block w-5 h-5 rounded"
                  style={{ backgroundColor: mat.color }}
                />
                <span className="text-white text-xs leading-none">{mat.label}</span>
                <span className={`text-[10px] leading-none ${isOutOfStock ? 'text-red-400' : 'text-gray-400'}`}>
                  {isOutOfStock ? '缺货' : `×${count}`}
                </span>
              </button>
            );
          })}
        </div>
        {/* Layer controls */}
        <div className="flex items-center gap-1 bg-gray-900/80 border border-gray-600 rounded-lg px-3 py-1.5 backdrop-blur">
          <button
            onClick={() => setLayer(Math.max(0, currentLayer - 1))}
            disabled={currentLayer <= 0}
            className="text-gray-400 hover:text-white disabled:opacity-30 px-1 text-sm transition-colors"
          >
            ▼
          </button>
          <span className="text-white text-xs min-w-[60px] text-center">
            层 {currentLayer}
          </span>
          <button
            onClick={() => setLayer(Math.min(15, currentLayer + 1))}
            disabled={currentLayer >= 15}
            className="text-gray-400 hover:text-white disabled:opacity-30 px-1 text-sm transition-colors"
          >
            ▲
          </button>
        </div>
      </div>

      {/* Function buttons - right center */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col gap-2">
        <button
          onClick={() => { setSaveName(''); setShowSaveInput(true); }}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-sm px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          保存蓝图
        </button>
        <button
          onClick={openLoadList}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-sm px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          加载蓝图
        </button>
        <button
          onClick={handleExportCode}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-sm px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          导出代码
        </button>
        <button
          onClick={() => { setImportText(''); setShowImportInput(true); }}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-sm px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          导入JSON
        </button>
        <button
          onClick={handleClearBuild}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white text-sm px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          清空建筑
        </button>
        <button
          onClick={deactivateBuildMode}
          className="bg-red-900/60 hover:bg-red-800 border border-red-700 text-white text-sm px-4 py-2 rounded transition-colors whitespace-nowrap mt-2"
        >
          退出建造
        </button>
      </div>

      {/* Save blueprint input modal */}
      {showSaveInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-4">保存蓝图</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="蓝图名称..."
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 outline-none focus:border-gray-500 mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBlueprint(); }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveInput(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveBlueprint}
                disabled={!saveName.trim()}
                className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load blueprint list modal */}
      {showLoadList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 w-96 shadow-xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">加载蓝图</h3>
              <button
                onClick={() => setShowLoadList(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            {blueprints.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">暂无保存的蓝图</p>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-2">
                {blueprints.map((bp) => (
                  <div
                    key={bp.name}
                    onClick={() => handleLoadBlueprint(bp.name)}
                    className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer transition-colors border border-gray-700"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">{bp.name}</div>
                      <div className="text-gray-400 text-xs">{bp.blockCount} 个方块</div>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(bp.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import JSON input modal */}
      {showImportInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-4">导入JSON</h3>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="粘贴JSON蓝图..."
              rows={8}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 outline-none focus:border-gray-500 mb-4 resize-none font-mono text-xs"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportInput(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImportJSON}
                disabled={!importText.trim()}
                className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-sm py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
