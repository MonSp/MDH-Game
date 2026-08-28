import type { Socket } from 'socket.io';
import { EconomyService, ItemService } from '../services';
import { getMarketPrices, adjustMarketSupply, adjustMarketDemand } from '../game/ServerGameLoop';
import type {
  EconomyBuyRequest, EconomySellRequest,
  SocketResult, EconomyBuyResponse, EconomySellResponse,
  EconomyMarketResponse, EconomyInventoryResponse
} from '../../shared/types/socket-events';
import { CurrencyType } from '../../shared';

export function registerEconomyHandlers(socket: Socket, getPlayerId: () => string | undefined) {
  const economy = EconomyService.getInstance();
  const items = ItemService.getInstance();

  socket.on('economy:buy', (req: EconomyBuyRequest) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('economy:buy:result', { success: false, error: '未登录' } satisfies SocketResult<EconomyBuyResponse>); return; }

    const item = items.getItem(req.itemId);
    if (!item) { socket.emit('economy:buy:result', { success: false, error: '物品不存在' } satisfies SocketResult<EconomyBuyResponse>); return; }

    const totalCost = item.price * req.quantity;
    const balance = economy.getCurrency(pid);
    if (balance < totalCost) {
      socket.emit('economy:buy:result', { success: false, error: '灵石不足' } satisfies SocketResult<EconomyBuyResponse>);
      return;
    }

    economy.spendCurrency(pid, CurrencyType.SpiritStone, totalCost);
    items.addItem(pid, req.itemId, req.quantity);
    adjustMarketSupply(req.itemId, -req.quantity);

    socket.emit('economy:buy:result', {
      success: true,
      data: {
        balance: economy.getCurrency(pid),
        inventory: items.getPlayerItems(pid)
      }
    } satisfies SocketResult<EconomyBuyResponse>);
  });

  socket.on('economy:sell', (req: EconomySellRequest) => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('economy:sell:result', { success: false, error: '未登录' } satisfies SocketResult<EconomySellResponse>); return; }

    const item = items.getItem(req.itemId);
    if (!item) { socket.emit('economy:sell:result', { success: false, error: '物品不存在' } satisfies SocketResult<EconomySellResponse>); return; }

    const owned = items.getItemCount(pid, req.itemId);
    if (owned < req.quantity) {
      socket.emit('economy:sell:result', { success: false, error: '物品数量不足' } satisfies SocketResult<EconomySellResponse>);
      return;
    }

    const sellPrice = Math.floor(item.price * 0.6) * req.quantity;
    items.removeItem(pid, req.itemId, req.quantity);
    economy.addCurrency(pid, CurrencyType.SpiritStone, sellPrice);
    adjustMarketSupply(req.itemId, req.quantity);

    socket.emit('economy:sell:result', {
      success: true,
      data: {
        balance: economy.getCurrency(pid),
        inventory: items.getPlayerItems(pid)
      }
    } satisfies SocketResult<EconomySellResponse>);
  });

  socket.on('economy:market', () => {
    const pid = getPlayerId();
    const balance = pid ? economy.getCurrency(pid) : 0;
    socket.emit('economy:market:result', {
      success: true,
      data: {
        items: getMarketPrices(),
        balance
      }
    } satisfies SocketResult<EconomyMarketResponse>);
  });

  socket.on('economy:inventory', () => {
    const pid = getPlayerId();
    if (!pid) { socket.emit('economy:inventory:result', { success: false, error: '未登录' } satisfies SocketResult<EconomyInventoryResponse>); return; }

    socket.emit('economy:inventory:result', {
      success: true,
      data: {
        items: items.getPlayerItems(pid),
        balance: economy.getCurrency(pid)
      }
    } satisfies SocketResult<EconomyInventoryResponse>);
  });
}
