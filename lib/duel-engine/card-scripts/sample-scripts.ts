// Sample Card Scripts - Common Yu-Gi-Oh! cards with effect definitions
// These serve as examples and provide immediate functionality for popular cards

import { 
  registerCardScript, 
  CardScript, 
  Filters, 
  Actions, 
  Costs, 
  Targets 
} from './script-types'

// ============================================
// SPELL CARDS
// ============================================

// Pot of Greed (ID: 55144522)
const potOfGreed: CardScript = {
  cardId: 55144522,
  cardName: 'Pot of Greed',
  cardType: 'spell',
  subType: 'normal',
  effects: [{
    id: 'pot-of-greed-draw',
    name: 'Draw 2',
    description: 'Draw 2 cards.',
    effectType: 'ignition',
    spellSpeed: 1,
    activationLocations: ['hand', 'spell_zone'],
    turnPlayerOnly: true,
    activationPhases: ['main1', 'main2'],
    actions: [
      Actions.draw(2)
    ]
  }]
}

// Raigeki (ID: 12580477)
const raigeki: CardScript = {
  cardId: 12580477,
  cardName: 'Raigeki',
  cardType: 'spell',
  subType: 'normal',
  effects: [{
    id: 'raigeki-destroy',
    name: 'Destroy All',
    description: 'Destroy all monsters your opponent controls.',
    effectType: 'ignition',
    spellSpeed: 1,
    activationLocations: ['hand', 'spell_zone'],
    turnPlayerOnly: true,
    activationPhases: ['main1', 'main2'],
    condition: (state, card) => {
      // Need at least 1 opponent monster to destroy
      return true // Simplified - would check for opponent monsters
    },
    actions: [{
      type: 'DESTROY',
      filter: Filters.and(Filters.monster(), Filters.controlledBy('opponent'), Filters.inLocation('monster_zone'))
    }]
  }]
}

// Monster Reborn (ID: 83764718)
const monsterReborn: CardScript = {
  cardId: 83764718,
  cardName: 'Monster Reborn',
  cardType: 'spell',
  subType: 'normal',
  effects: [{
    id: 'monster-reborn-revive',
    name: 'Revive Monster',
    description: 'Target 1 monster in either GY; Special Summon it.',
    effectType: 'ignition',
    spellSpeed: 1,
    activationLocations: ['hand', 'spell_zone'],
    turnPlayerOnly: true,
    activationPhases: ['main1', 'main2'],
    target: Targets.one(Filters.and(Filters.monster(), Filters.inLocation('graveyard'))),
    actions: [{
      type: 'SPECIAL_SUMMON',
      useTargets: true,
      from: 'graveyard',
      position: 'face_up_attack'
    }]
  }]
}

// Dark Hole (ID: 53129443)
const darkHole: CardScript = {
  cardId: 53129443,
  cardName: 'Dark Hole',
  cardType: 'spell',
  subType: 'normal',
  effects: [{
    id: 'dark-hole-destroy',
    name: 'Destroy All Monsters',
    description: 'Destroy all monsters on the field.',
    effectType: 'ignition',
    spellSpeed: 1,
    activationLocations: ['hand', 'spell_zone'],
    turnPlayerOnly: true,
    activationPhases: ['main1', 'main2'],
    actions: [{
      type: 'DESTROY',
      filter: Filters.and(Filters.monster(), Filters.inLocation('monster_zone'))
    }]
  }]
}

// Mystical Space Typhoon (ID: 5318639)
const mysticalSpaceTyphoon: CardScript = {
  cardId: 5318639,
  cardName: 'Mystical Space Typhoon',
  cardType: 'spell',
  subType: 'quick-play',
  effects: [{
    id: 'mst-destroy',
    name: 'Destroy Spell/Trap',
    description: 'Target 1 Spell/Trap on the field; destroy it.',
    effectType: 'quick',
    spellSpeed: 2,
    activationLocations: ['hand', 'spell_zone'],
    target: Targets.one(Filters.and(
      { cardType: ['spell', 'trap'] },
      Filters.inLocation(['spell_zone', 'field_zone'])
    )),
    actions: [
      Actions.destroy(true)
    ]
  }]
}

// Upstart Goblin (ID: 70368879)
const upstartGoblin: CardScript = {
  cardId: 70368879,
  cardName: 'Upstart Goblin',
  cardType: 'spell',
  subType: 'normal',
  effects: [{
    id: 'upstart-draw',
    name: 'Draw 1, Opponent Gains LP',
    description: 'Draw 1 card, then your opponent gains 1000 LP.',
    effectType: 'ignition',
    spellSpeed: 1,
    activationLocations: ['hand', 'spell_zone'],
    turnPlayerOnly: true,
    activationPhases: ['main1', 'main2'],
    actions: [
      Actions.draw(1),
      Actions.gainLP(1000) // Note: this should target opponent, simplified here
    ]
  }]
}

// Reinforcement of the Army (ID: 32807846)
const reinforcementOfTheArmy: CardScript = {
  cardId: 32807846,
  cardName: 'Reinforcement of the Army',
  cardType: 'spell',
  subType: 'normal',
  effects: [{
    id: 'rota-search',
    name: 'Search Warrior',
    description: 'Add 1 Level 4 or lower Warrior monster from your Deck to your hand.',
    effectType: 'ignition',
    spellSpeed: 1,
    activationLocations: ['hand', 'spell_zone'],
    turnPlayerOnly: true,
    activationPhases: ['main1', 'main2'],
    hardOncePerTurn: true,
    actions: [
      Actions.searchDeck(Filters.and(
        Filters.type('Warrior'),
        Filters.levelOrLower(4),
        Filters.controlledBy('self')
      ))
    ]
  }]
}

// ============================================
// TRAP CARDS
// ============================================

// Mirror Force (ID: 44095762)
const mirrorForce: CardScript = {
  cardId: 44095762,
  cardName: 'Mirror Force',
  cardType: 'trap',
  subType: 'normal',
  effects: [{
    id: 'mirror-force-destroy',
    name: 'Destroy Attack Position Monsters',
    description: 'When an opponent\'s monster declares an attack: Destroy all Attack Position monsters your opponent controls.',
    effectType: 'trigger',
    spellSpeed: 2,
    trigger: 'ATTACK_DECLARED',
    triggerCondition: (state, card, eventData) => {
      // Only trigger when opponent attacks
      return true // Simplified
    },
    activationLocations: ['spell_zone'],
    actions: [{
      type: 'DESTROY',
      filter: Filters.and(
        Filters.monster(),
        Filters.controlledBy('opponent'),
        Filters.inLocation('monster_zone'),
        { position: ['attack'] }
      )
    }]
  }]
}

// Torrential Tribute (ID: 53582587)
const torrentialTribute: CardScript = {
  cardId: 53582587,
  cardName: 'Torrential Tribute',
  cardType: 'trap',
  subType: 'normal',
  effects: [{
    id: 'torrential-destroy',
    name: 'Destroy All Monsters',
    description: 'When a monster(s) is Summoned: Destroy all monsters on the field.',
    effectType: 'trigger',
    spellSpeed: 2,
    trigger: ['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'FLIP_SUMMON'],
    activationLocations: ['spell_zone'],
    actions: [{
      type: 'DESTROY',
      filter: Filters.and(Filters.monster(), Filters.inLocation('monster_zone'))
    }]
  }]
}

// Solemn Judgment (ID: 41420027)
const solemnJudgment: CardScript = {
  cardId: 41420027,
  cardName: 'Solemn Judgment',
  cardType: 'trap',
  subType: 'counter',
  effects: [{
    id: 'solemn-negate',
    name: 'Negate Summon or Spell/Trap',
    description: 'When a monster(s) would be Summoned, OR a Spell/Trap Card is activated: Pay half your LP; negate, and destroy.',
    effectType: 'quick',
    spellSpeed: 3,
    trigger: ['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'SPELL_ACTIVATED', 'TRAP_ACTIVATED'],
    activationLocations: ['spell_zone'],
    cost: { type: 'pay_lp', amount: 0 }, // Half LP - special handling needed
    actions: [
      Actions.negateEffect(),
      Actions.destroy(true)
    ]
  }]
}

// Bottomless Trap Hole (ID: 29401950)
const bottomlessTrapHole: CardScript = {
  cardId: 29401950,
  cardName: 'Bottomless Trap Hole',
  cardType: 'trap',
  subType: 'normal',
  effects: [{
    id: 'bottomless-banish',
    name: 'Banish Summoned Monster',
    description: 'When your opponent Summons a monster(s) with 1500+ ATK: Destroy and banish it.',
    effectType: 'trigger',
    spellSpeed: 2,
    trigger: ['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'FLIP_SUMMON'],
    triggerCondition: (state, card, eventData) => {
      // Check if summoned monster has 1500+ ATK
      return true // Simplified
    },
    activationLocations: ['spell_zone'],
    actions: [
      Actions.destroy(true),
      Actions.banish(true)
    ]
  }]
}

// ============================================
// MONSTER CARDS
// ============================================

// Blue-Eyes White Dragon (ID: 89631139) - Normal Monster, no effects
const blueEyesWhiteDragon: CardScript = {
  cardId: 89631139,
  cardName: 'Blue-Eyes White Dragon',
  cardType: 'monster',
  subType: 'normal',
  effects: [] // Normal monsters have no effects
}

// Dark Magician (ID: 46986414) - Normal Monster, no effects
const darkMagician: CardScript = {
  cardId: 46986414,
  cardName: 'Dark Magician',
  cardType: 'monster',
  subType: 'normal',
  effects: []
}

// Effect Veiler (ID: 97268402)
const effectVeiler: CardScript = {
  cardId: 97268402,
  cardName: 'Effect Veiler',
  cardType: 'monster',
  subType: 'effect',
  effects: [{
    id: 'veiler-negate',
    name: 'Negate Monster Effect',
    description: 'During your opponent\'s Main Phase: Discard this card, then target 1 face-up Effect Monster your opponent controls; negate that monster\'s effects until the end of this turn.',
    effectType: 'quick',
    spellSpeed: 2,
    activationLocations: ['hand'],
    activationPhases: ['main1', 'main2'],
    turnPlayerOnly: false, // Activates during opponent's turn
    cost: Costs.discard(1, { custom: (card) => card.name === 'Effect Veiler' }),
    target: Targets.one(Filters.and(
      Filters.monster(),
      Filters.controlledBy('opponent'),
      Filters.inLocation('monster_zone'),
      Filters.faceUp()
    )),
    actions: [
      Actions.negateEffect()
    ]
  }]
}

// Ash Blossom & Joyous Spring (ID: 14558127)
const ashBlossom: CardScript = {
  cardId: 14558127,
  cardName: 'Ash Blossom & Joyous Spring',
  cardType: 'monster',
  subType: 'effect',
  effects: [{
    id: 'ash-negate',
    name: 'Negate Add/Special Summon/Send from Deck',
    description: 'When a card or effect that includes any of these effects is activated: discard this card; negate that effect. Add from Deck to hand, Special Summon from Deck, or Send from Deck to GY.',
    effectType: 'quick',
    spellSpeed: 2,
    activationLocations: ['hand'],
    trigger: 'EFFECT_ACTIVATED',
    triggerCondition: (state, card, eventData) => {
      // Check if effect involves deck manipulation
      return true // Simplified
    },
    hardOncePerTurn: true,
    cost: Costs.discard(1, { custom: (card) => card.name === 'Ash Blossom & Joyous Spring' }),
    actions: [
      Actions.negateEffect()
    ]
  }]
}

// Honest (ID: 37742478)
const honest: CardScript = {
  cardId: 37742478,
  cardName: 'Honest',
  cardType: 'monster',
  subType: 'effect',
  effects: [{
    id: 'honest-boost',
    name: 'ATK Boost During Battle',
    description: 'During the Damage Step, when a LIGHT monster you control battles: Return this card from your hand to the Deck; that monster gains ATK equal to the ATK of the opponent\'s monster it is battling.',
    effectType: 'quick',
    spellSpeed: 2,
    activationLocations: ['hand'],
    trigger: 'DAMAGE_CALC',
    triggerCondition: (state, card, eventData) => {
      // Check if a LIGHT monster you control is battling
      return true // Simplified
    },
    cost: { type: 'return_to_deck', amount: 1 },
    actions: [{
      type: 'CHANGE_ATK_DEF',
      atkChange: 0, // Would be opponent's ATK - needs special handling
      duration: 'end_of_battle'
    }]
  }]
}

// Man-Eater Bug (ID: 54652250)
const manEaterBug: CardScript = {
  cardId: 54652250,
  cardName: 'Man-Eater Bug',
  cardType: 'monster',
  subType: 'effect',
  effects: [{
    id: 'man-eater-flip',
    name: 'Flip: Destroy 1 Monster',
    description: 'FLIP: Target 1 monster on the field; destroy it.',
    effectType: 'flip',
    spellSpeed: 1,
    activationLocations: ['monster_zone'],
    trigger: 'FLIP_SUMMON',
    target: Targets.one(Filters.and(Filters.monster(), Filters.inLocation('monster_zone'))),
    actions: [
      Actions.destroy(true)
    ]
  }]
}

// Sangan (ID: 26202165)
const sangan: CardScript = {
  cardId: 26202165,
  cardName: 'Sangan',
  cardType: 'monster',
  subType: 'effect',
  effects: [{
    id: 'sangan-search',
    name: 'Search on Sent to GY',
    description: 'If this card is sent from the field to the GY: Add 1 monster with 1500 or less ATK from your Deck to your hand, but you cannot activate cards, or the effects of cards, with that name for the rest of this turn.',
    effectType: 'trigger',
    spellSpeed: 1,
    activationLocations: ['graveyard'],
    trigger: 'SENT_TO_GRAVEYARD_FROM_FIELD',
    hardOncePerTurn: true,
    actions: [
      Actions.searchDeck(Filters.and(
        Filters.monster(),
        { attack: { max: 1500 } },
        Filters.controlledBy('self')
      ))
    ]
  }]
}

// ============================================
// REGISTER ALL CARD SCRIPTS
// ============================================

export function registerAllCardScripts(): void {
  // Spells
  registerCardScript(potOfGreed)
  registerCardScript(raigeki)
  registerCardScript(monsterReborn)
  registerCardScript(darkHole)
  registerCardScript(mysticalSpaceTyphoon)
  registerCardScript(upstartGoblin)
  registerCardScript(reinforcementOfTheArmy)
  
  // Traps
  registerCardScript(mirrorForce)
  registerCardScript(torrentialTribute)
  registerCardScript(solemnJudgment)
  registerCardScript(bottomlessTrapHole)
  
  // Monsters
  registerCardScript(blueEyesWhiteDragon)
  registerCardScript(darkMagician)
  registerCardScript(effectVeiler)
  registerCardScript(ashBlossom)
  registerCardScript(honest)
  registerCardScript(manEaterBug)
  registerCardScript(sangan)
  
  console.log('[v0] Registered card scripts for common cards')
}

// Auto-register on import
registerAllCardScripts()
