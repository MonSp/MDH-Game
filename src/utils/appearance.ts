// 此文件负责定义和生成2.5D像素风角色形象的样式与属性
// 形象由三部分叠加而成：光环(Aura) + 躯体(Body) + 服饰/特效(Accessories)

import { Realm, BodyType } from '../store/gameStore';

export interface CharacterAppearance {
  auraColor: string; // 境界决定的光环颜色
  auraSize: number;  // 境界决定的光环大小
  auraOpacity: number; // 境界决定的光环透明度
  bodyColor: string; // 身份/家族决定的基础服饰颜色 (Tailwind)
  bodyHexColor: string; // Three.js 材质使用的颜色
  glowColor: string; // 体质决定的特效光芒
  effects: string[]; // 特殊特效类名（如：闪电、剑气）
}

// 1. 境界 (Realm) -> 决定光环大小和颜色底蕴
export function getRealmAura(realm: Realm) {
  const realms: Realm[] = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];
  const index = realms.indexOf(realm);
  
  // 颜色随境界加深：白 -> 蓝 -> 紫 -> 金 -> 红 -> 黑金
  let auraColor = '#ffffff';
  let auraOpacity = 0.1;
  
  if (index >= 8) { auraColor = '#ff0000'; auraOpacity = 0.6; }       // 大乘/渡劫
  else if (index >= 6) { auraColor = '#ffd700'; auraOpacity = 0.5; } // 炼虚/合体
  else if (index >= 4) { auraColor = '#9370db'; auraOpacity = 0.4; }// 元婴/化神
  else if (index >= 2) { auraColor = '#6495ed'; auraOpacity = 0.3; }// 筑基/金丹
  else if (index >= 1) { auraColor = '#c8ffff'; auraOpacity = 0.2; }// 练气

  // 光环大小随境界指数增长 (转换到 3D 尺寸，原先是 px，这里我们缩小 40 倍)
  const auraSize = (10 + Math.pow(index, 1.5) * 3) / 40;

  return { auraColor, auraSize, auraOpacity };
}

// 2. 体质 (BodyType) -> 决定躯体散发的特效光芒和材质
export function getBodyTypeGlow(bodyType: BodyType) {
  switch (bodyType) {
    case '剑体': return { glowColor: '#fbbf24', effects: ['animate-pulse', 'border-amber-400'] }; // 锐利的金色剑气
    case '雷灵体': return { glowColor: '#a855f7', effects: ['animate-bounce', 'border-purple-400'] }; // 狂暴的紫色雷电
    case '药王体': return { glowColor: '#10b981', effects: ['shadow-[0_0_15px_#10b981]', 'border-emerald-400'] }; // 柔和的绿色生机
    case '战体': return { glowColor: '#ef4444', effects: ['shadow-[0_0_20px_#ef4444]', 'border-rose-500'] }; // 炽热的红色血气
    case '仙体': return { glowColor: '#60a5fa', effects: ['shadow-[0_0_25px_#60a5fa]', 'border-blue-400'] }; // 飘渺的蓝色仙气
    case '神体': return { glowColor: '#fcd34d', effects: ['shadow-[0_0_30px_#fcd34d]', 'border-yellow-300'] }; // 耀眼的金色神光
    default: return { glowColor: 'transparent', effects: ['border-zinc-600'] }; // 凡体无特效
  }
}

// 3. 身份 (Role/Clan) -> 决定基础服饰颜色与模型高度
export function getRoleAppearance(role: string) {
  let bodyColor = 'bg-zinc-600'; // 默认灰衣
  let bodyHexColor = '#52525b';
  let hairHexColor = '#18181b'; // 默认黑发
  let skinHexColor = '#fcd34d'; // 默认肤色
  let hasBun = false; // 是否有发髻
  let height = 1.0; // 默认高度 (3D 尺寸, 1 单位 = 40px)
  let width = 0.6;  // 默认宽度

  if (role === '家主') {
    bodyColor = 'bg-amber-700'; // 华贵的暗金袍
    bodyHexColor = '#b45309';
    hairHexColor = '#e2e8f0'; // 白发/银发
    hasBun = true;
    height = 1.2;
    width = 0.7;
  } else if (role === '长老' || role === '执法堂长老') {
    if (role === '执法堂长老') {
      bodyColor = 'bg-rose-900';
      bodyHexColor = '#881337';
      hairHexColor = '#18181b'; // 黑发
    } else {
      bodyColor = 'bg-purple-800';
      bodyHexColor = '#6b21a8';
      hairHexColor = '#94a3b8'; // 灰发
      hasBun = true;
    }
    height = 1.1;
  } else if (role === '核心子弟') {
    bodyColor = 'bg-blue-700'; // 精英蓝袍
    bodyHexColor = '#1d4ed8';
    hasBun = true;
  } else if (role === '内门子弟') {
    bodyColor = 'bg-cyan-800'; // 内门青袍
    bodyHexColor = '#155e75';
  } else if (role === '玩家') {
    bodyColor = 'bg-emerald-700'; // 玩家专属主角绿袍
    bodyHexColor = '#047857';
    hasBun = true;
  }

  return { bodyColor, bodyHexColor, hairHexColor, skinHexColor, hasBun, height, width };
}

// 综合生成角色形象样式对象
export function generateCharacterStyle(realm: Realm, bodyType: BodyType, role: string) {
  const { auraColor, auraSize, auraOpacity } = getRealmAura(realm);
  const { glowColor, effects } = getBodyTypeGlow(bodyType);
  const { bodyColor, bodyHexColor, hairHexColor, skinHexColor, hasBun, height, width } = getRoleAppearance(role);

  return {
    auraColor,
    auraSize,
    auraOpacity,
    glowColor,
    effects: effects.join(' '),
    bodyColor,
    bodyHexColor,
    hairHexColor,
    skinHexColor,
    hasBun,
    height,
    width
  };
}