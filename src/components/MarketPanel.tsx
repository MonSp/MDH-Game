import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { X, ShoppingCart } from 'lucide-react';
import { PixelItemIcon } from './PixelItemIcon';
import { PixelPanel } from './PixelPanel';

export const MarketPanel = ({ onClose }: { onClose: () => void }) => {
  const { player, market, buyItem, sellItem } = useGameStore();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1);

  if (!player) return null;

  const marketItems = Object.values(market);
  const taxRate = player.country !== '魏' ? 0.15 : 0;

  const handleBuy = (itemName: string) => {
    buyItem(itemName, amount);
  };

  const handleSell = (itemName: string) => {
    sellItem(itemName, amount);
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <PixelPanel className="p-6 w-[600px] text-zinc-200">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-700 pb-2">
          <h2 className="text-xl font-bold flex items-center text-amber-400">
            <ShoppingCart className="mr-2" /> 中州坊市
          </h2>
          <button onClick={onClose} className="hover:text-rose-400 transition-colors">
            <X />
          </button>
        </div>

        <div className="mb-4 text-sm bg-zinc-800 p-3 rounded">
          <p>你的灵石：<span className="text-emerald-400 font-bold">{player.inventory['灵石'] || 0}</span></p>
          <p className="text-zinc-400 text-xs mt-1">
            当前关税：{taxRate * 100}% {taxRate > 0 ? '(非魏国修士交易将收取跨国关税)' : '(魏国修士免关税)'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-5 text-zinc-400 text-sm pb-2 border-b border-zinc-800">
            <div className="col-span-2">商品</div>
            <div>库存</div>
            <div>单价</div>
            <div>操作</div>
          </div>
          {marketItems.map(item => {
            const isSelected = selectedItem === item.name;
            const buyPrice = Math.floor(item.currentPrice * (1 + taxRate));
            const sellPrice = Math.floor(item.currentPrice * 0.8 * (1 - taxRate));
            const playerOwns = player.inventory[item.name] || 0;

            return (
              <div key={item.name} className="bg-zinc-800/50 p-2 rounded flex flex-col">
                <div className="grid grid-cols-5 items-center">
                  <div className="col-span-2 font-medium text-amber-200 flex items-center"><PixelItemIcon itemName={item.name} size={16} className="mr-1.5 shrink-0" />{item.name} <span className="text-xs text-zinc-500 ml-1">(拥有: {playerOwns})</span></div>
                  <div>{item.stock}</div>
                  <div className="text-emerald-400">{item.currentPrice}</div>
                  <div>
                    <button
                      onClick={() => setSelectedItem(isSelected ? null : item.name)}
                      className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition-colors"
                    >
                      {isSelected ? '取消' : '交易'}
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center justify-between bg-zinc-800 p-2 rounded">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setAmount(Math.max(1, amount - 1))} className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600">-</button>
                      <span className="w-8 text-center">{amount}</span>
                      <button onClick={() => setAmount(amount + 1)} className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600">+</button>
                    </div>
                    <div className="space-x-2">
                      <button 
                        onClick={() => handleBuy(item.name)}
                        disabled={item.stock < amount}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
                      >
                        买入 (需 {buyPrice * amount})
                      </button>
                      <button 
                        onClick={() => handleSell(item.name)}
                        disabled={playerOwns < amount}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
                      >
                        卖出 (得 {sellPrice * amount})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
};