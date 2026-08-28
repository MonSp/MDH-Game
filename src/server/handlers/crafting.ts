import type { Socket } from 'socket.io';
import type { SocketResult } from '../../shared/types/socket-events';
import { CRAFT_RECIPES, FORGE_RECIPE_META, getRecipe } from '../../store/craftingRecipes';
import { attemptCraft, generateEquipment } from '../game/GameEngine';

export interface CraftRequest {
  recipeId: string;
  buffMultiplier?: number;
}

export interface CraftResponse {
  success: boolean;
  product?: string;
  message: string;
  equipment?: {
    id: string;
    name: string;
    slot: string;
    rarity: string;
    baseStats: Record<string, number>;
    affixes: Array<{ stat: string; value: number; label: string }>;
  };
  inventory: Record<string, number>;
}

export function registerCraftingHandlers(
  socket: Socket,
  getPlayerId: () => string | undefined,
  getPlayerInventory: (playerId: string) => Record<string, number>,
  setPlayerInventory: (playerId: string, inventory: Record<string, number>) => void,
) {
  socket.on('economy:craft', (req: CraftRequest) => {
    const pid = getPlayerId();
    if (!pid) {
      socket.emit('economy:craft:result', { success: false, error: '未登录' } satisfies SocketResult<CraftResponse>);
      return;
    }

    const recipe = getRecipe(req.recipeId);
    if (!recipe) {
      socket.emit('economy:craft:result', { success: false, error: '配方不存在' } satisfies SocketResult<CraftResponse>);
      return;
    }

    const inventory = { ...getPlayerInventory(pid) };
    const result = attemptCraft(recipe, inventory, req.buffMultiplier ?? 1.0);

    // Always update inventory (materials consumed even on failure)
    setPlayerInventory(pid, inventory);

    if (result.success && result.product) {
      // If forge recipe, generate equipment
      const forgeMeta = FORGE_RECIPE_META[req.recipeId];
      if (forgeMeta) {
        const equip = generateEquipment(
          req.recipeId,
          recipe.name,
          forgeMeta.slot,
          forgeMeta.realmValue,
          forgeMeta.targetRarity,
        );
        socket.emit('economy:craft:result', {
          success: true,
          data: {
            success: true,
            product: result.product,
            message: result.message,
            equipment: {
              id: equip.id,
              name: equip.name,
              slot: equip.slot,
              rarity: equip.rarity,
              baseStats: equip.baseStats as Record<string, number>,
              affixes: equip.affixes,
            },
            inventory,
          },
        } satisfies SocketResult<CraftResponse>);
      } else {
        // Pill recipe — add product to inventory
        inventory[result.product] = (inventory[result.product] || 0) + 1;
        setPlayerInventory(pid, inventory);
        socket.emit('economy:craft:result', {
          success: true,
          data: { success: true, product: result.product, message: result.message, inventory },
        } satisfies SocketResult<CraftResponse>);
      }
    } else {
      socket.emit('economy:craft:result', {
        success: true,
        data: { success: false, message: result.message, inventory },
      } satisfies SocketResult<CraftResponse>);
    }
  });

  // List available recipes
  socket.on('economy:recipes', () => {
    socket.emit('economy:recipes:result', {
      success: true,
      data: CRAFT_RECIPES.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        quality: r.quality,
        materials: r.materials,
        product: r.product,
        baseSuccessRate: r.baseSuccessRate,
        realmRequired: r.realmRequired,
        effects: r.effects,
        description: r.description,
      })),
    });
  });
}
