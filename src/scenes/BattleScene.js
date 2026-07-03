import Phaser from "phaser";
import {
  TIER1_BATTLER_TEXTURE_KEYS,
  getBattlerAssetPath,
  getBattlerTextureKey,
  PET_PORTRAIT_MAX_HEIGHT,
  PET_PORTRAIT_MAX_WIDTH,
} from "../config/battlers.js";
import { createRandomTier1Team } from "../data/pets.js";
import { STARTING_GOLD, TEAM_SIZE } from "../config/game.js";

const RUN_STATE_KEY = "runState";
const SLOT_COUNT = 3;
const CARD_WIDTH = 174;
const CARD_HEIGHT = Math.ceil(PET_PORTRAIT_MAX_HEIGHT) + 58;
const PORTRAIT_Y = -43;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
  }

  init() {
    const runState = this.registry.get(RUN_STATE_KEY);

    this.playerTeamBySlot = Array.from({ length: TEAM_SIZE }, (_, slotIndex) => {
      const pet = runState?.team?.[slotIndex] ?? null;
      if (!pet) return null;

      const hp = pet.hp ?? pet.health;
      const maxHp = pet.maxHp ?? pet.health ?? hp;

      return {
        ...pet,
        hp,
        health: pet.health ?? hp,
        maxHp,
      };
    });

    const slottedPets = this.playerTeamBySlot
      .map((pet, slotIndex) => (pet ? { ...pet, slotIndex } : null))
      .filter(Boolean);

    if (slottedPets.length > 0) {
      this.leftTeam = slottedPets;
    } else {
      this.leftTeam = createRandomTier1Team(SLOT_COUNT).map((pet, slotIndex) => ({
        ...pet,
        slotIndex,
      }));
      this.playerTeamBySlot = Array.from({ length: TEAM_SIZE }, (_, slotIndex) => {
        const pet = this.leftTeam.find((member) => member.slotIndex === slotIndex);
        if (!pet) return null;
        return {
          ...pet,
          hp: pet.hp ?? pet.health,
          health: pet.health ?? pet.hp,
          maxHp: pet.maxHp ?? pet.health ?? pet.hp,
        };
      });
    }

    this.rightTeam = createRandomTier1Team(SLOT_COUNT);

    this.playerTeamShopSnapshot = this.playerTeamBySlot.map((pet) =>
      pet
        ? {
            ...pet,
            hp: pet.hp ?? pet.health,
            health: pet.health ?? pet.hp,
            maxHp: pet.maxHp ?? pet.health ?? pet.hp,
          }
        : null
    );
  }

  preload() {
    this.missingBattlers = new Set();

    this.load.on("loaderror", (file) => {
      this.missingBattlers.add(file.key);
    });

    TIER1_BATTLER_TEXTURE_KEYS.forEach((key) => {
      this.load.image(key, getBattlerAssetPath(key));
    });
  }

  create() {
    this.leftPets = [];
    this.rightPets = [];
    this.battleActive = false;
    this.battleEnded = false;
    this.leavingShop = false;
    this.resultText = null;
    this.resultBanner = null;
    this.nextRoundButton = null;

    this.drawBackgrounds();
    this.drawDivider();
    this.drawTeamLabels();
    this.drawSlotMarkers();

    this.initTeam("left", this.leftTeam);
    this.initTeam("right", this.rightTeam);

    this.time.delayedCall(800, () => this.runBattleLoop());
  }

  initTeam(side, teamData) {
    const pets = side === "left" ? this.leftPets : this.rightPets;
    const orderedTeamData =
      side === "left"
        ? [...teamData].sort((a, b) => a.slotIndex - b.slotIndex)
        : teamData;

    orderedTeamData.forEach((data, index) => {
      const slotIndex =
        side === "left"
          ? data.slotIndex
          : this.getSlotIndexForTeamPosition(side, index, teamData.length);
      const slotPos = this.getSlotPosition(side, slotIndex);
      const pet = this.createPet(data, side, slotIndex, slotPos.x, slotPos.y);
      pets.push(pet);
    });
  }

  getSlotIndexForTeamPosition(side, indexInTeam, teamSize) {
    if (side === "left") {
      return SLOT_COUNT - teamSize + indexInTeam;
    }

    return indexInTeam;
  }

  getSlotPosition(side, slotIndex) {
    const { width, height } = this.scale;
    const rowY = height * 0.55;

    const regionStart =
      side === "left" ? width * 0.03 : width * 0.52;
    const regionEnd =
      side === "left" ? width * 0.48 : width * 0.97;
    const totalWidth = regionEnd - regionStart;
    const step = (totalWidth - CARD_WIDTH) / (SLOT_COUNT - 1);

    return {
      x: regionStart + CARD_WIDTH / 2 + slotIndex * step,
      y: rowY,
    };
  }

  getFrontPet(pets, side) {
    if (pets.length === 0) return null;
    return side === "left" ? pets[pets.length - 1] : pets[0];
  }

  drawBackgrounds() {
    const { width, height } = this.scale;

    const leftBg = this.add.graphics();
    leftBg.fillGradientStyle(0x2d4a6f, 0x2d4a6f, 0x1e3a5f, 0x1e3a5f, 1);
    leftBg.fillRect(0, 0, width / 2, height);

    const rightBg = this.add.graphics();
    rightBg.fillGradientStyle(0x5c3d6e, 0x5c3d6e, 0x3d2650, 0x3d2650, 1);
    rightBg.fillRect(width / 2, 0, width / 2, height);
  }

  drawDivider() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    const divider = this.add.graphics();
    divider.lineStyle(4, 0xffffff, 0.25);
    divider.beginPath();
    divider.moveTo(centerX, 24);
    divider.lineTo(centerX, height - 24);
    divider.strokePath();

    this.vsBadge = this.add.circle(centerX, height / 2, 28, 0xffffff, 0.15);
    this.vsBadge.setStrokeStyle(2, 0xffffff, 0.4);

    this.vsText = this.add
      .text(centerX, height / 2, "VS", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  drawTeamLabels() {
    const { width } = this.scale;

    this.add
      .text(width * 0.25, 36, "You", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width * 0.75, 36, "Opponent", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  drawSlotMarkers() {
    const underlineWidth = 36;
    const underlineY = CARD_HEIGHT / 2 + 14;

    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const leftPos = this.getSlotPosition("left", i);
      const rightPos = this.getSlotPosition("right", i);

      this.drawSlotUnderline(leftPos.x, leftPos.y + underlineY, underlineWidth);
      this.drawSlotUnderline(rightPos.x, rightPos.y + underlineY, underlineWidth);
    }
  }

  drawSlotUnderline(x, y, width) {
    const line = this.add.graphics();
    line.lineStyle(2, 0xffffff, 0.35);
    line.beginPath();
    line.moveTo(x - width / 2, y);
    line.lineTo(x + width / 2, y);
    line.strokePath();
  }

  createPet(data, side, slotIndex, x, y) {
    const container = this.add.container(x, y);
    const cardHeight = CARD_HEIGHT;

    const cardChildren = [];
    const portrait = this.createPetPortrait(data, side, slotIndex);

    if (portrait) {
      cardChildren.push(portrait);
    }

    const nameText = this.add
      .text(0, cardHeight / 2 - 44, data.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#1a1a2e",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const statsY = PORTRAIT_Y + PET_PORTRAIT_MAX_HEIGHT / 2 - 22;
    const attackGroup = this.createStatGroup(-22, statsY, data.attack, 0xe03131);
    const hpGroup = this.createStatGroup(22, statsY, data.hp, 0x1971c2);

    container.add([...cardChildren, nameText, attackGroup, hpGroup]);

    return {
      id: data.id,
      sourcePet: { ...data },
      name: data.name,
      attack: data.attack,
      hp: data.hp,
      maxHp: data.hp,
      color: data.color,
      side,
      slotIndex,
      container,
      homeX: x,
      homeY: y,
      attackGroup,
      hpGroup,
      alive: true,
    };
  }

  createPetPortrait(data, side, slotIndex) {
    const textureKey = getBattlerTextureKey(data.id);

    if (!this.textures.exists(textureKey) || this.missingBattlers.has(textureKey)) {
      return null;
    }

    const portraitGroup = this.add.container(0, PORTRAIT_Y);

    const glow = this.add.ellipse(
      0,
      PET_PORTRAIT_MAX_HEIGHT * 0.22,
      PET_PORTRAIT_MAX_WIDTH * 0.72,
      PET_PORTRAIT_MAX_HEIGHT * 0.18,
      data.color,
      0.18
    );
    glow.setOrigin(0.5);

    const portrait = this.add.image(0, 0, textureKey);
    this.fitImageToBox(portrait, PET_PORTRAIT_MAX_WIDTH, PET_PORTRAIT_MAX_HEIGHT);

    portraitGroup.add([glow, portrait]);

    const targetScale = portraitGroup.scale;
    portraitGroup.setAlpha(0);
    portraitGroup.setScale(targetScale * 0.9);

    this.tweens.add({
      targets: portraitGroup,
      alpha: 1,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 320,
      ease: "Quad.easeOut",
      delay: slotIndex * 90 + (side === "right" ? 45 : 0),
    });

    return portraitGroup;
  }

  fitImageToBox(image, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    image.setScale(scale);
    image.setOrigin(0.5);
  }

  updateHpDisplay(pet) {
    pet.hpGroup.valueText.setText(String(Math.max(0, pet.hp)));
  }

  applyDamage(pet, amount) {
    pet.hp -= amount;
    this.updateHpDisplay(pet);

    if (pet.side === "left" && this.playerTeamBySlot[pet.slotIndex]) {
      this.playerTeamBySlot[pet.slotIndex].hp = Math.max(0, pet.hp);
    }

    this.tweens.add({
      targets: pet.container,
      scaleX: 1.08,
      scaleY: 0.92,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  createStatGroup(x, y, value, color) {
    const group = this.add.container(x, y);
    const radius = 15;

    const circle = this.add.circle(0, 0, radius, color, 1);

    const valueText = this.add
      .text(0, 0, String(value), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    group.add([circle, valueText]);
    group.valueText = valueText;
    return group;
  }

  async runBattleLoop() {
    if (this.battleActive) return;
    this.battleActive = true;

    try {
      while (true) {
        const outcome = this.checkBattleOutcome();
        if (outcome) {
          this.showResult(outcome);
          break;
        }

        const leftFront = this.getFrontPet(this.leftPets, "left");
        const rightFront = this.getFrontPet(this.rightPets, "right");

        if (!leftFront || !rightFront) {
          this.showResult(this.checkBattleOutcome() ?? "draw");
          break;
        }

        await this.playExchangeAnimation(leftFront, rightFront);

        const leftAttack = leftFront.attack;
        const rightAttack = rightFront.attack;
        this.applyDamage(leftFront, rightAttack);
        this.applyDamage(rightFront, leftAttack);

        const leftDead = leftFront.hp <= 0;
        const rightDead = rightFront.hp <= 0;
        const deaths = [];

        if (leftDead) deaths.push(leftFront);
        if (rightDead) deaths.push(rightFront);

        if (deaths.length > 0) {
          await Promise.all(deaths.map((pet) => this.eliminatePet(pet)));

          const repositions = [];
          if (leftDead) repositions.push(this.repositionTeam("left"));
          if (rightDead) repositions.push(this.repositionTeam("right"));
          await Promise.all(repositions);

          await this.delay(300);
        } else {
          await this.delay(450);
        }
      }
    } catch (error) {
      console.error("Battle loop error:", error);
      this.showResult(this.checkBattleOutcome() ?? "draw");
    } finally {
      this.battleActive = false;
    }
  }

  delay(ms) {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  checkBattleOutcome() {
    const leftAlive = this.leftPets.length > 0;
    const rightAlive = this.rightPets.length > 0;

    if (!leftAlive && !rightAlive) return "draw";
    if (!leftAlive) return "opponent";
    if (!rightAlive) return "you";
    return null;
  }

  playExchangeAnimation(leftPet, rightPet) {
    return new Promise((resolve) => {
      const { width } = this.scale;
      const centerX = width / 2;
      const lungeDistance = 40;

      const leftTargetX = leftPet.homeX + lungeDistance;
      const rightTargetX = rightPet.homeX - lungeDistance;

      this.tweens.add({
        targets: leftPet.container,
        x: leftTargetX,
        duration: 200,
        ease: "Quad.easeOut",
        yoyo: true,
        hold: 120,
      });

      this.tweens.add({
        targets: rightPet.container,
        x: rightTargetX,
        duration: 200,
        ease: "Quad.easeOut",
        yoyo: true,
        hold: 120,
        onComplete: () => {
          this.showClashEffect(centerX, leftPet.homeY);
          resolve();
        },
      });
    });
  }

  showClashEffect(x, y) {
    const flash = this.add.circle(x, y, 20, 0xffffff, 0.8);
    this.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 250,
      onComplete: () => flash.destroy(),
    });
  }

  eliminatePet(pet) {
    return new Promise((resolve) => {
      pet.alive = false;
      this.removePetFromTeam(pet);

      if (pet.side === "left" && this.playerTeamBySlot[pet.slotIndex]) {
        this.playerTeamBySlot[pet.slotIndex].hp = 0;
      }

      this.tweens.killTweensOf(pet.container);
      pet.container.setScale(1);

      this.tweens.add({
        targets: pet.container,
        alpha: 0,
        scale: 0.5,
        duration: 350,
        ease: "Quad.easeIn",
        onComplete: () => {
          pet.container.destroy(true);
          resolve();
        },
      });
    });
  }

  removePetFromTeam(pet) {
    const team = pet.side === "left" ? this.leftPets : this.rightPets;
    const index = team.indexOf(pet);
    if (index !== -1) team.splice(index, 1);
  }

  repositionTeam(side) {
    const team = side === "left" ? this.leftPets : this.rightPets;
    const tweens = team.map(
      (pet, index) =>
        new Promise((resolve) => {
          const slotIndex = this.getSlotIndexForTeamPosition(
            side,
            index,
            team.length
          );
          const pos = this.getSlotPosition(side, slotIndex);
          pet.slotIndex = slotIndex;
          pet.homeX = pos.x;
          pet.homeY = pos.y;

          this.tweens.add({
            targets: pet.container,
            x: pos.x,
            y: pos.y,
            duration: 350,
            ease: "Quad.easeOut",
            onComplete: resolve,
          });
        })
    );

    return Promise.all(tweens);
  }

  showResult(outcome) {
    if (this.battleEnded) return;
    this.battleEnded = true;

    const { width, height } = this.scale;
    let message;
    let color;

    if (outcome === "you") {
      message = "You Win!";
      color = "#69db7c";
    } else if (outcome === "opponent") {
      message = "Opponent Wins!";
      color = "#ff6b6b";
    } else {
      message = "Draw!";
      color = "#ffd43b";
    }

    this.resultBanner = this.add
      .rectangle(width / 2, height / 2, width * 0.7, 72, 0x000000, 0.75)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setDepth(100);

    this.resultText = this.add
      .text(width / 2, height / 2, message, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(101);

    this.tweens.add({
      targets: [this.resultBanner, this.resultText],
      alpha: 1,
      duration: 400,
      ease: "Quad.easeOut",
    });

    if (this.vsText) {
      this.vsText.setText("—");
    }

    this.time.delayedCall(450, () => {
      this.showNextRoundButton(width, height);
    });
  }

  showNextRoundButton(width, height) {
    if (this.nextRoundButton) return;

    const buttonY = height / 2 + 80;
    const button = this.add.container(width / 2, buttonY).setDepth(200);
    const bg = this.add.rectangle(0, 0, 200, 48, 0x2f9e44, 1);
    bg.setStrokeStyle(2, 0xffffff, 0.25);

    const label = this.add
      .text(0, 0, "Next Round", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(200, 48);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => this.goToNextRound());

    this.nextRoundButton = button;
  }

  goToNextRound() {
    if (this.leavingShop) return;
    this.leavingShop = true;

    const runState = this.registry.get(RUN_STATE_KEY) ?? {};
    const team = (this.playerTeamShopSnapshot ?? []).map((pet) => (pet ? { ...pet } : null));

    this.registry.set(RUN_STATE_KEY, {
      ...runState,
      round: (runState.round || 1) + 1,
      gold: STARTING_GOLD,
      team,
    });

    this.scene.start("ShopScene");
  }
}
