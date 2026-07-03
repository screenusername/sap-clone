import Phaser from "phaser";
import { STARTING_GOLD, TEAM_SIZE } from "../config/game.js";
import {
  BATTLER_TEXTURE_KEYS,
  getBattlerAssetPath,
  getBattlerTextureKey,
  PET_PORTRAIT_MAX_HEIGHT,
  PET_PORTRAIT_MAX_WIDTH,
} from "../config/battlers.js";
import { getShopCostForTier } from "../data/tiers.js";
import { applyPetUpgrade, petsCanMerge } from "../data/pets.js";
import {
  getShopOfferCountForRound,
  getRerollCost,
  getSellValue,
  getShopPoolForRound,
  rollShopOffers,
} from "../data/shop.js";
import { rollItemOffers } from "../data/itemShop.js";
import { applyItemToPet, getItemDefinition } from "../data/items.js";

const RUN_STATE_KEY = "runState";
const SHOP_PORTRAIT_SCALE = 0.72;
const SHOP_PORTRAIT_MAX_WIDTH = PET_PORTRAIT_MAX_WIDTH * SHOP_PORTRAIT_SCALE;
const SHOP_PORTRAIT_MAX_HEIGHT = PET_PORTRAIT_MAX_HEIGHT * SHOP_PORTRAIT_SCALE;
const CARD_WIDTH = 158;
const CARD_HEIGHT = Math.ceil(SHOP_PORTRAIT_MAX_HEIGHT) + 46;
const PORTRAIT_Y = -28;
const PANEL_SPLIT_RATIO = 0.5;
const SHOP_ROW_NUDGE_PX = 50;
const ITEM_CARD_WIDTH = 86;
const ITEM_CARD_HEIGHT = 108;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: "ShopScene" });
  }

  init() {
    const saved = this.registry.get(RUN_STATE_KEY) ?? {};
    this.runState = {
      gold: STARTING_GOLD,
      round: 1,
      team: [],
      ...saved,
    };
    this.runState.round = this.runState.round || 1;
    this.runState.gold = this.runState.gold ?? STARTING_GOLD;
    this.runState.team = Array.from({ length: TEAM_SIZE }, (_, index) => saved.team?.[index] ?? null);
    this.registry.set(RUN_STATE_KEY, this.runState);

    this.shopOffers = rollShopOffers(this.runState.round);
    if (this.shopOffers.length === 0) {
      this.shopOffers = rollShopOffers(1);
    }
    this.shopSlots = [];
    this.itemSlots = [];
    this.teamSlots = [];
    this.dragState = null;

    this.itemOffers = rollItemOffers();
  }

  preload() {
    this.missingBattlers = new Set();

    this.load.on("loaderror", (file) => {
      this.missingBattlers.add(file.key);
    });

    BATTLER_TEXTURE_KEYS.forEach((key) => {
      this.load.image(key, getBattlerAssetPath(key));
    });
  }

  create() {
    this.drawBackground();
    this.createHeader();
    this.createTeamPanel();
    this.createShopPanel();
    this.createItemShopPanel();
    this.createFooter();
    this.refreshGoldDisplay();
    this.refreshStartBattleButton();
    this.refreshShopSubtitle();
    this.refreshRerollButton();
    this.refreshTeamHint();
    this.setupDragInput();
  }

  setupDragInput() {
    this.input.on("gameobjectdown", (pointer, gameObject) => {
      if (this.dragState) return;

      const shopIndex = gameObject.getData("shopSlotIndex");
      if (shopIndex != null) {
        const slot = this.shopSlots[shopIndex];
        if (!slot?.pet || slot.sold) return;

        this.dragState = {
          type: "shop",
          slot,
          pointerId: pointer.id,
          startX: pointer.worldX,
          startY: pointer.worldY,
          offsetX: slot.container.x - pointer.worldX,
          offsetY: slot.container.y - pointer.worldY,
          moved: false,
        };
        return;
      }

      const itemIndex = gameObject.getData("itemSlotIndex");
      if (itemIndex != null) {
        const slot = this.itemSlots[itemIndex];
        if (!slot?.item || slot.sold) return;

        this.dragState = {
          type: "item",
          slot,
          pointerId: pointer.id,
          startX: pointer.worldX,
          startY: pointer.worldY,
          offsetX: slot.container.x - pointer.worldX,
          offsetY: slot.container.y - pointer.worldY,
          moved: false,
        };
        return;
      }

      const teamIndex = gameObject.getData("teamSlotIndex");
      if (teamIndex == null) return;

      const slot = this.teamSlots[teamIndex];
      if (!slot?.pet) return;

      this.dragState = {
        type: "team",
        slot,
        pointerId: pointer.id,
        startX: pointer.worldX,
        startY: pointer.worldY,
        offsetX: slot.container.x - pointer.worldX,
        offsetY: slot.container.y - pointer.worldY,
        moved: false,
      };
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.dragState || pointer.id !== this.dragState.pointerId) return;

      const { slot, startX, startY, offsetX, offsetY } = this.dragState;
      const distance = Phaser.Math.Distance.Between(
        startX,
        startY,
        pointer.worldX,
        pointer.worldY
      );

      if (!this.dragState.moved) {
        if (distance < 10) return;
        this.dragState.moved = true;
        slot.container.setDepth(20);

        if (this.dragState.type === "team") {
          this.showSellZone();
        }
      }

      slot.container.x = pointer.worldX + offsetX;
      slot.container.y = pointer.worldY + offsetY;

      if (this.dragState.type === "shop") {
        this.highlightTeamDropTarget(this.getTeamSlotAtPoint(pointer.worldX, pointer.worldY));
      } else if (this.dragState.type === "item") {
        this.highlightItemDropTarget(this.getTeamSlotAtPoint(pointer.worldX, pointer.worldY));
      } else if (this.dragState.type === "team") {
        this.highlightTeamReorderTarget(
          this.getTeamSlotAtPoint(pointer.worldX, pointer.worldY),
          slot.index
        );
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (!this.dragState || pointer.id !== this.dragState.pointerId) return;

      const { type, slot, moved } = this.dragState;

      if (type === "shop") {
        slot.container.setDepth(10);
        this.highlightTeamDropTarget(null);

        if (moved) {
          const targetTeamSlot = this.getTeamSlotAtPoint(pointer.worldX, pointer.worldY);
          if (targetTeamSlot) {
            this.tryBuyIntoTeamSlot(slot, targetTeamSlot.index);
          } else {
            this.snapSlotHome(slot);
          }
        } else {
          this.snapSlotHome(slot);
        }
      } else if (type === "item") {
        slot.container.setDepth(10);
        this.highlightItemDropTarget(null);

        if (moved) {
          const targetTeamSlot = this.getTeamSlotAtPoint(pointer.worldX, pointer.worldY);
          if (targetTeamSlot) {
            this.tryApplyItemToTeamMember(slot, targetTeamSlot.index);
          } else {
            this.snapSlotHome(slot);
          }
        } else {
          this.snapSlotHome(slot);
        }
      } else if (type === "team") {
        if (moved) {
          slot.container.setDepth(10);
          this.highlightTeamReorderTarget(null, null);

          if (this.isOverSellZone(pointer.worldX, pointer.worldY)) {
            this.sellTeamPet(slot.index);
          } else {
            const targetTeamSlot = this.getTeamSlotAtPoint(pointer.worldX, pointer.worldY);
            if (targetTeamSlot && targetTeamSlot.index !== slot.index) {
              if (!this.tryMergeTeamMember(slot.index, targetTeamSlot.index)) {
                this.moveTeamMember(slot.index, targetTeamSlot.index);
              }
            } else {
              this.snapSlotHome(slot);
            }
          }
        }
      }

      this.hideSellZone();
      this.dragState = null;
    });
  }

  snapSlotHome(slot) {
    slot.container.x = slot.x;
    slot.container.y = slot.y;
  }

  getPanelSplitY() {
    return this.scale.height * PANEL_SPLIT_RATIO;
  }

  getRightButtonX() {
    return this.scale.width - 100;
  }

  drawBackground() {
    const { width, height } = this.scale;
    const splitY = this.getPanelSplitY();

    const teamBg = this.add.graphics();
    teamBg.fillGradientStyle(0x2d4a6f, 0x2d4a6f, 0x1e3a5f, 0x1e3a5f, 1);
    teamBg.fillRect(0, 0, width, splitY);

    const shopBg = this.add.graphics();
    shopBg.fillGradientStyle(0x3d5a40, 0x3d5a40, 0x2a3f2c, 0x2a3f2c, 1);
    shopBg.fillRect(0, splitY, width, height - splitY);

    const divider = this.add.graphics();
    divider.lineStyle(3, 0xffffff, 0.15);
    divider.beginPath();
    divider.moveTo(0, splitY);
    divider.lineTo(width, splitY);
    divider.strokePath();
  }

  createHeader() {
    const { width } = this.scale;

    this.goldText = this.add
      .text(width - 24, 24, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffd43b",
      })
      .setOrigin(1, 0.5);
  }

  createTeamPanel() {
    const { width, height } = this.scale;
    const splitY = this.getPanelSplitY();
    const rowY = splitY * 0.58;
    const positions = this.getRowPositions(TEAM_SIZE, width * 0.1, width * 0.9, rowY);

    this.add
      .text(width / 2, 56, "Your Team", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    positions.forEach((pos, index) => {
      this.createTeamSlot(index, pos.x, pos.y);
    });
  }

  createShopPanel() {
    const { width, height } = this.scale;
    const splitY = this.getPanelSplitY();
    const bottomPanelHeight = height - splitY;
    const rowY = splitY + bottomPanelHeight * 0.52 + SHOP_ROW_NUDGE_PX;
    const offerCount = getShopOfferCountForRound(this.runState.round);
    const positions = this.getRowPositions(
      offerCount,
      width * 0.06,
      width * 0.46,
      rowY
    );

    this.add
      .text(width * 0.26, splitY + 28, "Battlers For Sale", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.shopSubtitleText = this.add
      .text(width * 0.26, splitY + 52, this.getShopSubtitle(), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#b2f2bb",
      })
      .setOrigin(0.5);

    this.teamHintText = this.add
      .text(width / 2, 82, this.getTeamHint(), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#a5d8ff",
      })
      .setOrigin(0.5);

    positions.forEach((pos, index) => {
      this.createShopSlot(index, pos.x, pos.y);
    });
  }

  createItemShopPanel() {
    const { width, height } = this.scale;
    const splitY = this.getPanelSplitY();
    const itemCenterX = width * 0.72;
    const itemPositions = [
      { x: itemCenterX - 52, y: splitY + 118 },
      { x: itemCenterX + 52, y: splitY + 118 },
      { x: itemCenterX - 52, y: splitY + 238 },
      { x: itemCenterX + 52, y: splitY + 238 },
    ];

    this.add
      .text(itemCenterX, splitY + 28, "Items", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.itemSubtitleText = this.add
      .text(itemCenterX, splitY + 52, this.getItemShopSubtitle(), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#ffe066",
      })
      .setOrigin(0.5);

    itemPositions.forEach((pos, index) => {
      this.createItemSlot(index, pos.x, pos.y);
    });
  }

  createItemSlot(index, x, y) {
    const slot = {
      index,
      x,
      y,
      item: this.itemOffers[index] ?? null,
      container: this.add.container(x, y),
      sold: false,
    };

    slot.container.setDepth(10);
    this.renderItemSlot(slot);
    this.itemSlots.push(slot);
  }

  renderItemSlot(slot) {
    slot.container.x = slot.x;
    slot.container.y = slot.y;
    slot.container.setDepth(10);
    slot.container.removeAll(true);
    slot.container.removeAllListeners();
    slot.container.disableInteractive();

    if (!slot.item || slot.sold) {
      return;
    }

    this.buildItemDisplay(slot.container, slot.item);

    slot.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -ITEM_CARD_WIDTH / 2,
        -ITEM_CARD_HEIGHT / 2,
        ITEM_CARD_WIDTH,
        ITEM_CARD_HEIGHT
      ),
      Phaser.Geom.Rectangle.Contains
    );
    slot.container.setData("itemSlotIndex", slot.index);
  }

  buildItemDisplay(container, item) {
    const canAfford = this.runState.gold >= item.cost;
    const bg = this.add.rectangle(0, 0, ITEM_CARD_WIDTH, ITEM_CARD_HEIGHT, item.color, 0.22);
    bg.setStrokeStyle(2, item.color, canAfford ? 0.9 : 0.35);

    const icon = this.add
      .text(0, -24, item.icon, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "28px",
      })
      .setOrigin(0.5);

    const nameText = this.add
      .text(0, 8, item.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#1a1a2e",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const effectText = this.add
      .text(0, 24, item.description, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
        color: "#e9ecef",
      })
      .setOrigin(0.5);

    const costText = this.add
      .text(0, 40, `$${item.cost}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: canAfford ? "#ffd43b" : "#868e96",
      })
      .setOrigin(0.5);

    container.add([bg, icon, nameText, effectText, costText]);
    container.setAlpha(canAfford ? 1 : 0.7);
  }

  createShopSlot(index, x, y) {
    const slot = {
      index,
      x,
      y,
      pet: this.shopOffers[index] ?? null,
      container: this.add.container(x, y),
      sold: false,
    };

    slot.container.setDepth(10);
    this.renderShopSlot(slot);
    this.shopSlots.push(slot);
  }

  renderShopSlot(slot) {
    slot.container.x = slot.x;
    slot.container.y = slot.y;
    slot.container.setDepth(10);
    slot.container.removeAll(true);
    slot.container.removeAllListeners();
    slot.container.disableInteractive();

    if (!slot.pet || slot.sold) {
      return;
    }

    this.buildPetDisplay(slot.container, slot.pet);

    slot.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -CARD_WIDTH / 2,
        -CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT
      ),
      Phaser.Geom.Rectangle.Contains
    );
    slot.container.setData("shopSlotIndex", slot.index);
  }

  createTeamSlot(index, x, y) {
    const slot = {
      index,
      x,
      y,
      pet: this.runState.team[index] ?? null,
      container: this.add.container(x, y),
      selectionRing: null,
      dropHighlight: null,
    };

    slot.container.setDepth(10);
    this.renderTeamSlot(slot);
    this.teamSlots.push(slot);
  }

  renderTeamSlot(slot) {
    slot.container.x = slot.x;
    slot.container.y = slot.y;
    slot.container.setDepth(10);
    slot.container.removeAll(true);
    slot.container.removeAllListeners();
    slot.container.disableInteractive();
    slot.container.setData("teamSlotIndex", null);
    slot.selectionRing = null;
    slot.dropHighlight = null;

    const underline = this.add.graphics();
    underline.lineStyle(2, 0xffffff, 0.25);
    underline.beginPath();
    underline.moveTo(-18, CARD_HEIGHT / 2 + 8);
    underline.lineTo(18, CARD_HEIGHT / 2 + 8);
    underline.strokePath();
    slot.container.add(underline);

    if (!slot.pet) {
      slot.container.setData("teamDropIndex", slot.index);
      const emptyLabel = this.add
        .text(0, 0, "Empty", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#868e96",
        })
        .setOrigin(0.5);
      slot.container.add(emptyLabel);

      slot.dropHighlight = this.add.graphics();
      slot.dropHighlight.lineStyle(3, 0x69db7c, 0);
      slot.dropHighlight.strokeRoundedRect(
        -CARD_WIDTH / 2 + 4,
        -CARD_HEIGHT / 2 + 4,
        CARD_WIDTH - 8,
        CARD_HEIGHT - 8,
        10
      );
      slot.container.add(slot.dropHighlight);
      return;
    }

    this.buildPetDisplay(slot.container, slot.pet);

    slot.selectionRing = this.add.graphics();
    slot.selectionRing.lineStyle(3, 0xffd43b, 0);
    slot.selectionRing.strokeRoundedRect(
      -CARD_WIDTH / 2 + 4,
      -CARD_HEIGHT / 2 + 4,
      CARD_WIDTH - 8,
      CARD_HEIGHT - 8,
      10
    );
    slot.container.add(slot.selectionRing);
    slot.container.sendToBack(slot.selectionRing);

    slot.container.setInteractive(
      new Phaser.Geom.Rectangle(
        -CARD_WIDTH / 2,
        -CARD_HEIGHT / 2,
        CARD_WIDTH,
        CARD_HEIGHT
      ),
      Phaser.Geom.Rectangle.Contains
    );
    slot.container.setData("teamSlotIndex", slot.index);
  }

  buildPetDisplay(container, pet) {
    const portrait = this.createPetPortrait(pet);
    if (portrait) {
      container.add(portrait);
    }

    const nameText = this.add
      .text(0, CARD_HEIGHT / 2 - 36, pet.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#1a1a2e",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const statsY = PORTRAIT_Y + SHOP_PORTRAIT_MAX_HEIGHT / 2 - 18;
    const attackGroup = this.createStatGroup(-20, statsY, pet.attack, 0xe03131);
    const hpGroup = this.createStatGroup(20, statsY, pet.hp ?? pet.health, 0x1971c2);

    const displayChildren = [nameText, attackGroup, hpGroup];
    const itemBadge = this.createItemBadge(pet);
    if (itemBadge) {
      displayChildren.push(itemBadge);
    }

    container.add(displayChildren);
  }

  createItemBadge(pet) {
    const itemIcons = (pet.items ?? [])
      .map((itemId) => getItemDefinition(itemId)?.icon ?? "✦")
      .join("");

    if (!itemIcons) return null;

    return this.add
      .text(0, CARD_HEIGHT / 2 - 18, itemIcons, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
      })
      .setOrigin(0.5);
  }

  createPetPortrait(pet) {
    const textureKey = getBattlerTextureKey(pet.id);
    const portraitGroup = this.add.container(0, PORTRAIT_Y);

    if (!this.textures.exists(textureKey) || this.missingBattlers.has(textureKey)) {
      const body = this.add.rectangle(0, 0, 52, 78, pet.color, 0.35);
      body.setStrokeStyle(2, pet.color, 0.85);
      const initial = this.add
        .text(0, 0, pet.name.charAt(0), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "30px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      portraitGroup.add([body, initial]);
      this.addUpgradeStars(portraitGroup, pet);
      return portraitGroup;
    }

    const glow = this.add.ellipse(
      0,
      SHOP_PORTRAIT_MAX_HEIGHT * 0.22,
      SHOP_PORTRAIT_MAX_WIDTH * 0.72,
      SHOP_PORTRAIT_MAX_HEIGHT * 0.18,
      pet.color,
      0.18
    );
    glow.setOrigin(0.5);

    const portrait = this.add.image(0, 0, textureKey);
    this.fitImageToBox(portrait, SHOP_PORTRAIT_MAX_WIDTH, SHOP_PORTRAIT_MAX_HEIGHT);
    portraitGroup.add([glow, portrait]);
    this.addUpgradeStars(portraitGroup, pet);

    return portraitGroup;
  }

  addUpgradeStars(portraitGroup, pet) {
    const upgradeCount = pet.upgrades ?? 0;
    if (upgradeCount <= 0) return;

    for (let i = 0; i < upgradeCount; i += 1) {
      const star = this.add
        .text(
          -SHOP_PORTRAIT_MAX_WIDTH / 2 + 12 + i * 14,
          -SHOP_PORTRAIT_MAX_HEIGHT / 2 + 10,
          "★",
          {
            fontFamily: "system-ui, sans-serif",
            fontSize: "14px",
            color: "#ffd43b",
            stroke: "#1a1a2e",
            strokeThickness: 3,
          }
        )
        .setOrigin(0.5);
      portraitGroup.add(star);
    }
  }

  fitImageToBox(image, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    image.setScale(scale);
    image.setOrigin(0.5);
  }

  createStatGroup(x, y, value, color) {
    const group = this.add.container(x, y);
    const circle = this.add.circle(0, 0, 13, color, 1);
    const valueText = this.add
      .text(0, 0, String(value), {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    group.add([circle, valueText]);
    return group;
  }

  createFooter() {
    const { width, height } = this.scale;
    const splitY = this.getPanelSplitY();
    const bottomPanelHeight = height - splitY;
    const rightButtonX = this.getRightButtonX();
    const sellPanelWidth = width * 0.42;
    const sellCenterX = width * 0.79;
    const sellCenterY = splitY + bottomPanelHeight / 2;

    this.sellZone = this.add.container(sellCenterX, sellCenterY);
    this.sellZone.setVisible(false);
    this.sellZone.setDepth(5);

    const sellPanelBg = this.add.rectangle(
      0,
      0,
      sellPanelWidth - 20,
      bottomPanelHeight - 20,
      0x4a3040,
      0.92
    );
    sellPanelBg.setStrokeStyle(2, 0xff8787, 0.45);

    const sellLabel = this.add
      .text(0, 0, "Sell", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffc9c9",
      })
      .setOrigin(0.5);

    this.sellZone.add([sellPanelBg, sellLabel]);
    this.sellZoneHalfWidth = (sellPanelWidth - 20) / 2;
    this.sellZoneHalfHeight = (bottomPanelHeight - 20) / 2;

    this.rerollButton = this.createActionButton(
      rightButtonX,
      height - 80,
      `Re-roll ($${getRerollCost()})`,
      0x495057,
      () => this.rerollShop()
    );
    this.rerollButton.setDepth(10);

    this.startBattleButton = this.createActionButton(
      rightButtonX,
      height - 28,
      "Start Battle",
      0x2f9e44,
      () => this.startBattle()
    );
    this.startBattleButton.setDepth(10);
  }

  showSellZone() {
    this.sellZone?.setVisible(true);
  }

  hideSellZone() {
    this.sellZone?.setVisible(false);
  }

  getSellZoneBounds() {
    const matrix = this.sellZone.getWorldTransformMatrix();
    return new Phaser.Geom.Rectangle(
      matrix.tx - this.sellZoneHalfWidth,
      matrix.ty - this.sellZoneHalfHeight,
      this.sellZoneHalfWidth * 2,
      this.sellZoneHalfHeight * 2
    );
  }

  createActionButton(x, y, label, color, onClick) {
    const button = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 170, 44, color, 1);
    bg.setStrokeStyle(2, 0xffffff, 0.25);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    button.add([bg, text]);
    button.bg = bg;
    button.setSize(170, 44);
    button.setInteractive({ useHandCursor: true });

    button.on("pointerdown", () => {
      if (button.enabled !== false) {
        onClick();
      }
    });

    button.setEnabled = (enabled) => {
      button.enabled = enabled;
      bg.setAlpha(enabled ? 1 : 0.45);
      text.setAlpha(enabled ? 1 : 0.65);
    };

    button.setEnabled(true);
    return button;
  }

  getTeamHint() {
    if (this.getFilledTeamCount() >= TEAM_SIZE) {
      return "Team full — drag battlers to Sell, or items onto battlers to buff";
    }

    return "Drag shop battlers into team slots, or items onto battlers";
  }

  refreshTeamHint() {
    this.teamHintText?.setText(this.getTeamHint());
  }

  getShopSubtitle() {
    const remaining = this.shopSlots.filter((slot) => slot.pet && !slot.sold).length;
    const offerCount = getShopOfferCountForRound(this.runState.round);
    const available = remaining || offerCount;
    return `${available} for sale · drag to team · $3 each`;
  }

  getItemShopSubtitle() {
    const remaining = this.itemSlots.filter((slot) => slot.item && !slot.sold).length;
    return `${remaining} available · drag onto a battler`;
  }

  refreshItemShopSubtitle() {
    this.itemSubtitleText?.setText(this.getItemShopSubtitle());
  }

  refreshItemShop() {
    this.itemSlots.forEach((slot) => {
      this.renderItemSlot(slot);
    });
    this.refreshItemShopSubtitle();
  }

  getFilledTeamCount() {
    return this.runState.team.filter(Boolean).length;
  }

  getSlotBounds(slot) {
    return new Phaser.Geom.Rectangle(
      slot.x - CARD_WIDTH / 2,
      slot.y - CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT
    );
  }

  getTeamSlotAtPoint(worldX, worldY) {
    return (
      this.teamSlots.find((slot) => this.getSlotBounds(slot).contains(worldX, worldY)) ??
      null
    );
  }

  highlightTeamDropTarget(teamSlot) {
    const dragPet =
      this.dragState?.type === "shop" && !this.dragState.slot.sold
        ? this.dragState.slot.pet
        : null;

    this.teamSlots.forEach((slot) => {
      if (!slot.dropHighlight) return;

      const targetPet = this.runState.team[slot.index];
      const isEmptyTarget = teamSlot === slot && !targetPet;
      const isMergeTarget =
        teamSlot === slot &&
        dragPet &&
        targetPet &&
        petsCanMerge(dragPet, targetPet);
      const isValidTarget = isEmptyTarget || isMergeTarget;

      slot.dropHighlight.clear();
      slot.dropHighlight.lineStyle(
        3,
        isMergeTarget ? 0xffd43b : 0x69db7c,
        isValidTarget ? 1 : 0
      );
      slot.dropHighlight.strokeRoundedRect(
        -CARD_WIDTH / 2 + 4,
        -CARD_HEIGHT / 2 + 4,
        CARD_WIDTH - 8,
        CARD_HEIGHT - 8,
        10
      );

      if (slot.selectionRing && targetPet) {
        slot.selectionRing.clear();
        slot.selectionRing.lineStyle(3, isMergeTarget ? 0xffd43b : 0xffd43b, isMergeTarget ? 1 : 0);
        slot.selectionRing.strokeRoundedRect(
          -CARD_WIDTH / 2 + 4,
          -CARD_HEIGHT / 2 + 4,
          CARD_WIDTH - 8,
          CARD_HEIGHT - 8,
          10
        );
      }
    });
  }

  highlightTeamReorderTarget(teamSlot, sourceIndex) {
    const sourcePet = this.runState.team[sourceIndex];

    this.teamSlots.forEach((slot) => {
      const isTarget =
        teamSlot && teamSlot.index !== sourceIndex && teamSlot === slot;
      const isMergeTarget =
        isTarget && sourcePet && slot.pet && petsCanMerge(sourcePet, slot.pet);

      if (slot.dropHighlight) {
        slot.dropHighlight.clear();
        slot.dropHighlight.lineStyle(
          3,
          isMergeTarget ? 0xffd43b : 0x69db7c,
          isTarget && !slot.pet ? 1 : 0
        );
        slot.dropHighlight.strokeRoundedRect(
          -CARD_WIDTH / 2 + 4,
          -CARD_HEIGHT / 2 + 4,
          CARD_WIDTH - 8,
          CARD_HEIGHT - 8,
          10
        );
      }

      if (slot.selectionRing && slot.pet) {
        slot.selectionRing.clear();
        slot.selectionRing.lineStyle(
          3,
          isMergeTarget ? 0xffd43b : 0x74c0fc,
          isTarget ? 1 : 0
        );
        slot.selectionRing.strokeRoundedRect(
          -CARD_WIDTH / 2 + 4,
          -CARD_HEIGHT / 2 + 4,
          CARD_WIDTH - 8,
          CARD_HEIGHT - 8,
          10
        );
      }
    });
  }

  highlightItemDropTarget(teamSlot) {
    this.teamSlots.forEach((slot) => {
      if (!slot.selectionRing) return;

      const hasPet = Boolean(this.runState.team[slot.index]);
      const isTarget = teamSlot === slot && hasPet;

      slot.selectionRing.clear();
      slot.selectionRing.lineStyle(3, 0xffd43b, isTarget ? 1 : 0);
      slot.selectionRing.strokeRoundedRect(
        -CARD_WIDTH / 2 + 4,
        -CARD_HEIGHT / 2 + 4,
        CARD_WIDTH - 8,
        CARD_HEIGHT - 8,
        10
      );
    });
  }

  tryApplyItemToTeamMember(itemSlot, teamSlotIndex) {
    if (!itemSlot.item || itemSlot.sold) {
      this.snapSlotHome(itemSlot);
      return;
    }

    const targetPet = this.runState.team[teamSlotIndex];
    if (!targetPet) {
      this.snapSlotHome(itemSlot);
      return;
    }

    const cost = itemSlot.item.cost;
    if (this.runState.gold < cost) {
      this.flashGoldText();
      this.snapSlotHome(itemSlot);
      return;
    }

    this.runState.gold -= cost;
    this.runState.team[teamSlotIndex] = applyItemToPet(targetPet, itemSlot.item);
    itemSlot.sold = true;
    itemSlot.container.disableInteractive();
    itemSlot.container.setData("itemSlotIndex", null);
    this.renderItemSlot(itemSlot);
    this.syncTeamSlots();
    this.refreshGoldDisplay();
    this.refreshItemShopSubtitle();
    this.refreshRerollButton();
    this.snapSlotHome(itemSlot);

    const slot = this.teamSlots[teamSlotIndex];
    if (slot) {
      this.tweens.add({
        targets: slot.container,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 100,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  moveTeamMember(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    const team = [...this.runState.team];
    const pet = team[fromIndex];
    if (!pet) return;

    if (!team[toIndex]) {
      team[fromIndex] = null;
      team[toIndex] = pet;
    } else if (Math.abs(fromIndex - toIndex) === 1) {
      team[fromIndex] = team[toIndex];
      team[toIndex] = pet;
    } else if (this.hasFilledSlotsBetween(team, fromIndex, toIndex)) {
      if (fromIndex < toIndex) {
        for (let i = fromIndex; i < toIndex; i++) {
          team[i] = team[i + 1];
        }
      } else {
        for (let i = fromIndex; i > toIndex; i--) {
          team[i] = team[i - 1];
        }
      }
      team[toIndex] = pet;
    } else {
      team[fromIndex] = team[toIndex];
      team[toIndex] = pet;
    }

    this.runState.team = team;
    this.syncTeamSlots();
  }

  hasFilledSlotsBetween(team, fromIndex, toIndex) {
    const start = Math.min(fromIndex, toIndex) + 1;
    const end = Math.max(fromIndex, toIndex) - 1;

    for (let i = start; i <= end; i++) {
      if (!team[i]) return false;
    }

    return start <= end;
  }

  tryMergeTeamMember(fromIndex, toIndex) {
    const source = this.runState.team[fromIndex];
    const target = this.runState.team[toIndex];

    if (!petsCanMerge(source, target)) {
      return false;
    }

    const team = [...this.runState.team];
    team[toIndex] = applyPetUpgrade(target);
    team[fromIndex] = null;
    this.runState.team = team;
    this.syncTeamSlots();
    return true;
  }

  tryMergeShopIntoTeam(shopSlot, teamSlotIndex) {
    const target = this.runState.team[teamSlotIndex];

    if (!shopSlot.pet || shopSlot.sold || !petsCanMerge(shopSlot.pet, target)) {
      return false;
    }

    const cost = shopSlot.pet.shopCost ?? getShopCostForTier(shopSlot.pet.tier);

    if (this.runState.gold < cost) {
      this.flashGoldText();
      this.snapSlotHome(shopSlot);
      return true;
    }

    this.runState.gold -= cost;
    this.runState.team[teamSlotIndex] = applyPetUpgrade(target);
    shopSlot.sold = true;
    shopSlot.container.disableInteractive();
    shopSlot.container.setData("shopSlotIndex", null);
    this.renderShopSlot(shopSlot);
    this.syncTeamSlots();
    this.refreshGoldDisplay();
    this.refreshShopSubtitle();
    this.refreshRerollButton();
    this.refreshTeamHint();
    this.snapSlotHome(shopSlot);
    return true;
  }

  tryBuyIntoTeamSlot(shopSlot, teamSlotIndex) {
    if (!shopSlot.pet || shopSlot.sold) {
      this.snapSlotHome(shopSlot);
      return;
    }

    if (this.runState.team[teamSlotIndex]) {
      if (this.tryMergeShopIntoTeam(shopSlot, teamSlotIndex)) {
        return;
      }

      this.shakeTeamSlot(teamSlotIndex);
      this.snapSlotHome(shopSlot);
      return;
    }

    const cost = shopSlot.pet.shopCost ?? getShopCostForTier(shopSlot.pet.tier);

    if (this.runState.gold < cost) {
      this.flashGoldText();
      this.snapSlotHome(shopSlot);
      return;
    }

    if (this.getFilledTeamCount() >= TEAM_SIZE) {
      this.shakeTeamRow();
      this.snapSlotHome(shopSlot);
      return;
    }

    this.runState.gold -= cost;
    this.runState.team[teamSlotIndex] = { ...shopSlot.pet };
    shopSlot.sold = true;
    shopSlot.container.disableInteractive();
    shopSlot.container.setData("shopSlotIndex", null);
    this.renderShopSlot(shopSlot);
    this.syncTeamSlots();
    this.refreshGoldDisplay();
    this.refreshStartBattleButton();
    this.refreshShopSubtitle();
    this.refreshRerollButton();
    this.refreshTeamHint();
  }

  shakeTeamSlot(index) {
    const slot = this.teamSlots[index];
    if (!slot) return;

    this.tweens.add({
      targets: slot.container,
      x: slot.x + 6,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        slot.container.x = slot.x;
      },
    });
  }

  refreshShopSubtitle() {
    this.shopSubtitleText?.setText(this.getShopSubtitle());
  }

  refreshRerollButton() {
    if (!this.rerollButton) return;

    const offerCount = getShopOfferCountForRound(this.runState.round);
    const canReroll = offerCount > 0 && this.runState.gold >= getRerollCost();
    this.rerollButton.setEnabled(canReroll);
  }

  rerollShop() {
    const offerCount = getShopOfferCountForRound(this.runState.round);
    if (offerCount === 0) return;

    const cost = getRerollCost();
    if (this.runState.gold < cost) {
      this.flashGoldText();
      return;
    }

    this.runState.gold -= cost;
    this.shopOffers = rollShopOffers(this.runState.round, offerCount);
    this.itemOffers = rollItemOffers();

    this.shopSlots.forEach((slot, index) => {
      slot.pet = this.shopOffers[index] ?? null;
      slot.sold = false;
      this.renderShopSlot(slot);
    });

    this.itemSlots.forEach((slot, index) => {
      slot.item = this.itemOffers[index] ?? null;
      slot.sold = false;
      this.renderItemSlot(slot);
    });

    this.refreshGoldDisplay();
    this.refreshShopSubtitle();
    this.refreshItemShopSubtitle();
    this.refreshRerollButton();
  }

  getRowPositions(count, startX, endX, y) {
    if (count <= 1) {
      return [{ x: (startX + endX) / 2, y }];
    }

    const step = (endX - startX - CARD_WIDTH) / (count - 1);
    return Array.from({ length: count }, (_, index) => ({
      x: startX + CARD_WIDTH / 2 + index * step,
      y,
    }));
  }

  syncTeamSlots() {
    this.teamSlots.forEach((slot, index) => {
      slot.pet = this.runState.team[index] ?? null;
      slot.container.x = slot.x;
      slot.container.y = slot.y;
      this.renderTeamSlot(slot);
    });
    this.refreshTeamHint();
  }

  sellTeamPet(index) {
    if (!this.runState.team[index]) return;

    this.runState.team[index] = null;
    this.runState.gold += getSellValue();
    this.syncTeamSlots();
    this.refreshGoldDisplay();
    this.refreshStartBattleButton();
    this.refreshShopSubtitle();
    this.refreshRerollButton();
  }

  isOverSellZone(worldX, worldY) {
    if (!this.sellZone?.visible) return false;
    return this.getSellZoneBounds().contains(worldX, worldY);
  }

  refreshGoldDisplay() {
    this.goldText.setText(`$${this.runState.gold}`);
    this.refreshRerollButton();
    this.refreshItemShop();
  }

  refreshStartBattleButton() {
    this.startBattleButton.setEnabled(this.getFilledTeamCount() > 0);
  }

  flashGoldText() {
    this.tweens.add({
      targets: this.goldText,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  shakeTeamRow() {
    this.teamSlots.forEach((slot) => {
      this.tweens.add({
        targets: slot.container,
        x: slot.x + 6,
        duration: 50,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          slot.container.x = slot.x;
        },
      });
    });
  }

  startBattle() {
    if (this.getFilledTeamCount() === 0) return;

    this.registry.set(RUN_STATE_KEY, {
      ...this.runState,
      team: this.runState.team.map((pet) => (pet ? { ...pet } : null)),
    });

    this.scene.start("BattleScene");
  }
}
