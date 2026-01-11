import { PlantType } from './garden.types';

export function getPlantEmoji(type: PlantType): string {
  switch (type) {
    case 'Succulent': return '🌵'; // 多肉/仙人掌
    case 'Fern':      return '🌿'; // 蕨类
    case 'Foliage':   return '🪴'; // 观叶
    case 'Flowering': return '🌺'; // 开花
    default:          return '🌱';
  }
}