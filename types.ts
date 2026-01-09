
export enum GreetingTheme {
  CLASSIC = 'Classic',
  FUTURISTIC = 'Futuristic',
  POETIC = 'Poetic',
  PIRATE = 'Pirate',
  QUANTUM = 'Quantum'
}

export interface GeneratedGreeting {
  text: string;
  language: string;
  meaning: string;
}

export interface ChartData {
  name: string;
  value: number;
}
