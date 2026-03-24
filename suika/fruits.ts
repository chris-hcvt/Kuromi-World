/// <reference types="vite/client" />

export interface FruitDefinition {
  level: number;
  name: string;
  radius: number;
  score: number;
  image: string;
}

const b = import.meta.env.BASE_URL;

export const FRUITS: FruitDefinition[] = [
  { level: 0, name: 'Tier 1', radius: 20, score: 1, image: `${b}images/suika/1.png` },
  { level: 1, name: 'Tier 2', radius: 32, score: 3, image: `${b}images/suika/2.png` },
  { level: 2, name: 'Tier 3', radius: 46, score: 6, image: `${b}images/suika/3.png` },
  { level: 3, name: 'Tier 4', radius: 60, score: 10, image: `${b}images/suika/4.png` },
  { level: 4, name: 'Tier 5', radius: 75, score: 15, image: `${b}images/suika/5.png` },
  { level: 5, name: 'Tier 6', radius: 95, score: 21, image: `${b}images/suika/6.png` },
  { level: 6, name: 'Tier 7', radius: 115, score: 28, image: `${b}images/suika/7.png` },
  { level: 7, name: 'Tier 8', radius: 135, score: 36, image: `${b}images/suika/8.png` },
  { level: 8, name: 'Tier 9', radius: 160, score: 45, image: `${b}images/suika/9.png` },
];
