import Phaser from 'phaser';
import { LoginScene } from '@/scenes/LoginScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { TutorialScene } from '@/scenes/TutorialScene';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { VictoryScene } from '@/scenes/VictoryScene';
import { LeaderboardScene } from '@/scenes/LeaderboardScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    LoginScene,
    MainMenuScene,
    TutorialScene,
    GameScene,
    GameOverScene,
    VictoryScene,
    LeaderboardScene,
  ],
};

new Phaser.Game(config);
