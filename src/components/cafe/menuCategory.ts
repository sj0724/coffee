import type { MenuCategory } from '@/src/types';

const COFFEE_OPTIONS = [
  '에스프레소',
  '아메리카노',
  '라떼',
  '카푸치노',
  '플랫화이트',
  '핸드드립',
  '콜드브루',
];

export function getMenuCategory(menuName: string, isCoffee?: number | null): MenuCategory {
  if (menuName === '핸드드립') return 'handdip';
  if (isCoffee === 1) return 'espresso';
  if (isCoffee === 2) return 'dessert';
  if (isCoffee === 0) return 'simple';
  return COFFEE_OPTIONS.includes(menuName) ? 'espresso' : 'simple';
}
