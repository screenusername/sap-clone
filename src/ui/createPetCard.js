import {
  getBattlerTextureKey,
  PET_PORTRAIT_MAX_HEIGHT,
  PET_PORTRAIT_MAX_WIDTH,
} from "../config/battlers.js";

export const PET_CARD_WIDTH = 174;
export const PET_CARD_HEIGHT = Math.ceil(PET_PORTRAIT_MAX_HEIGHT) + 58;
export const PET_PORTRAIT_Y = -43;

const TEXT_STYLE = {
  fontFamily: "system-ui, sans-serif",
};

export function fitImageToBox(image, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  image.setScale(scale);
  image.setOrigin(0.5);
}

export function createStatGroup(scene, x, y, value, color) {
  const group = scene.make.container({ x, y, add: false });
  const circle = scene.make.circle({ x: 0, y: 0, radius: 15, color, add: false });
  const valueText = scene.make.text({
    x: 0,
    y: 0,
    text: String(value),
    ...TEXT_STYLE,
    fontSize: "15px",
    fontStyle: "bold",
    color: "#ffffff",
    add: false,
  });
  valueText.setOrigin(0.5);

  group.add([circle, valueText]);
  group.valueText = valueText;
  return group;
}

export function createPetPortrait(scene, pet, missingBattlers, options = {}) {
  const textureKey = getBattlerTextureKey(pet.id);
  const portraitGroup = scene.make.container({ x: 0, y: PET_PORTRAIT_Y, add: false });

  if (!scene.textures.exists(textureKey) || missingBattlers.has(textureKey)) {
    const body = scene.make.rectangle({
      x: 0,
      y: 0,
      width: 72,
      height: 108,
      color: pet.color,
      alpha: 0.35,
      add: false,
    });
    body.setStrokeStyle(2, pet.color, 0.85);

    const initial = scene.make.text({
      x: 0,
      y: 0,
      text: pet.name.charAt(0),
      ...TEXT_STYLE,
      fontSize: "42px",
      fontStyle: "bold",
      color: "#ffffff",
      add: false,
    });
    initial.setOrigin(0.5);
    portraitGroup.add([body, initial]);
    return portraitGroup;
  }

  const glow = scene.make.ellipse({
    x: 0,
    y: PET_PORTRAIT_MAX_HEIGHT * 0.22,
    width: PET_PORTRAIT_MAX_WIDTH * 0.72,
    height: PET_PORTRAIT_MAX_HEIGHT * 0.18,
    color: pet.color,
    alpha: 0.18,
    add: false,
  });
  glow.setOrigin(0.5);

  const portrait = scene.make.image({
    x: 0,
    y: 0,
    key: textureKey,
    add: false,
  });
  fitImageToBox(portrait, PET_PORTRAIT_MAX_WIDTH, PET_PORTRAIT_MAX_HEIGHT);
  portraitGroup.add([glow, portrait]);

  if (options.animateIn) {
    const targetScale = portraitGroup.scale;
    portraitGroup.setAlpha(0);
    portraitGroup.setScale(targetScale * 0.9);

    scene.tweens.add({
      targets: portraitGroup,
      alpha: 1,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 320,
      ease: "Quad.easeOut",
      delay: options.animateDelay ?? 0,
    });
  }

  return portraitGroup;
}

export function createPetCard(scene, pet, missingBattlers, options = {}) {
  const container = scene.make.container({ x: 0, y: 0, add: false });
  const cardChildren = [];

  const portrait = createPetPortrait(scene, pet, missingBattlers, {
    animateIn: options.animateIn,
    animateDelay: options.animateDelay,
  });
  cardChildren.push(portrait);

  const nameText = scene.make.text({
    x: 0,
    y: PET_CARD_HEIGHT / 2 - 44,
    text: pet.name,
    ...TEXT_STYLE,
    fontSize: "16px",
    fontStyle: "bold",
    color: "#ffffff",
    stroke: "#1a1a2e",
    strokeThickness: 4,
    add: false,
  });
  nameText.setOrigin(0.5);

  const statsY = PET_PORTRAIT_Y + PET_PORTRAIT_MAX_HEIGHT / 2 - 22;
  const attackGroup = createStatGroup(scene, -22, statsY, pet.attack, 0xe03131);
  const hpGroup = createStatGroup(scene, 22, statsY, pet.hp ?? pet.health, 0x1971c2);

  cardChildren.push(nameText, attackGroup, hpGroup);

  if (options.showPrice) {
    const priceTag = scene.make.text({
      x: 0,
      y: -PET_CARD_HEIGHT / 2 + 18,
      text: `$${pet.shopCost}`,
      ...TEXT_STYLE,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffd43b",
      stroke: "#1a1a2e",
      strokeThickness: 3,
      add: false,
    });
    priceTag.setOrigin(0.5);
    cardChildren.push(priceTag);
  }

  container.add(cardChildren);

  const selectionRing = scene.make.graphics({ add: false });
  selectionRing.lineStyle(3, 0xffd43b, 0);
  selectionRing.strokeRoundedRect(
    -PET_CARD_WIDTH / 2 + 4,
    -PET_CARD_HEIGHT / 2 + 4,
    PET_CARD_WIDTH - 8,
    PET_CARD_HEIGHT - 8,
    10
  );
  container.add(selectionRing);
  container.sendToBack(selectionRing);

  container.setSelected = (selected) => {
    selectionRing.clear();
    selectionRing.lineStyle(3, 0xffd43b, selected ? 1 : 0);
    selectionRing.strokeRoundedRect(
      -PET_CARD_WIDTH / 2 + 4,
      -PET_CARD_HEIGHT / 2 + 4,
      PET_CARD_WIDTH - 8,
      PET_CARD_HEIGHT - 8,
      10
    );
  };

  container.setSize(PET_CARD_WIDTH, PET_CARD_HEIGHT);

  return container;
}
