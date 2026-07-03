import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene.js";
import { ShopScene } from "./scenes/ShopScene.js";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a1a2e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ShopScene, BattleScene],
};

export default new Phaser.Game(config);

document.getElementById("loading")?.remove();
