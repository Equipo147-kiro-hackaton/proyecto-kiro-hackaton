import Phaser from 'phaser';
import { LoginScene } from '@/scenes/LoginScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { TutorialScene } from '@/scenes/TutorialScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { VictoryScene } from '@/scenes/VictoryScene';
import { LeaderboardScene } from '@/scenes/LeaderboardScene';
import { HUDScene } from '@/scenes/HUDScene';
import { ExplorationScene } from '@/scenes/ExplorationScene';
import { BossFightScene } from '@/scenes/BossFightScene';
import { PuzzleScene } from '@/scenes/PuzzleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: {
    createContainer: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    LoginScene,
    MainMenuScene,
    TutorialScene,
    GameOverScene,
    VictoryScene,
    LeaderboardScene,
    HUDScene,
    ExplorationScene,
    BossFightScene,
    PuzzleScene,
  ],
  parent: 'game-container',
  backgroundColor: '#0a0a1a',
};

const game = new Phaser.Game(config);

export default game;
