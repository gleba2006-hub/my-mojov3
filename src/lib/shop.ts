export const shopItems = [
  { id: "movie", title: "סרט משפחתי", cost: 20 },
  { id: "ice", title: "גלידה", cost: 15 },
  { id: "play", title: "זמן משחק", cost: 30 },
  { id: "sleep", title: "לינה אצל חבר", cost: 60 },
  { id: "chest", title: "תיבת הפתעה", cost: 25 },
  { id: "shield", title: "מגן רצף", cost: 15 },
];

export function coinsFromXp(xp: number) {
  return Math.floor(xp / 10);
}
