import { targeted } from './_factory.js';

// Every entry becomes a /command that takes a target user, fetches a matching
// GIF (with provider failover) and tracks a per-pair counter. `category` is
// the GIF category; `noun` is used in the counter footer.
const ACTIONS = [
  {
    name: 'hug', description: 'Give someone a warm hug 🤗', category: 'hug',
    emoji: '🤗', verb: 'hugs', noun: 'hug', backLabel: 'Hug back!',
    self: 'You hug yourself tight... self-love matters too! 💖',
    bot: 'A hug?! For me?! *hugs back tightly* 🥺💞',
  },
  {
    name: 'kiss', description: 'Kiss someone 💋', category: 'kiss',
    emoji: '💋', verb: 'kisses', noun: 'kiss', backLabel: 'Kiss back!',
    self: 'Mwah! You blow yourself a kiss in the mirror. Confidence! 😘',
    bot: 'O-oh! 😳 *blushes in robot* My circuits are overheating!',
  },
  {
    name: 'cuddle', description: 'Cuddle up with someone 🫂', category: 'cuddle',
    emoji: '🫂', verb: 'cuddles with', noun: 'cuddle', backLabel: 'Cuddle back!',
    self: 'You wrap yourself in a blanket burrito. Cozy! 🌯',
    bot: '*snuggles into your arms* Beep boop... this is nice 🥺',
  },
  {
    name: 'lick', description: 'Lick someone... okay then 👅', category: 'lick',
    emoji: '👅', verb: 'licks', noun: 'lick', backLabel: 'Lick back!',
    self: 'You lick... yourself? Like a cat? 🐱 Okay then.',
    bot: 'Eww, now my chassis is all slobbery! 🤖💦',
  },
  {
    name: 'pat', description: 'Give someone headpats 🫳', category: 'pat',
    emoji: '🥰', verb: 'pats', noun: 'headpat', backLabel: 'Pat back!',
    self: 'You pat your own head. There, there. 🥺',
    bot: '*happy robot noises* Right on the antenna! 🤖✨',
  },
  {
    name: 'slap', description: 'Slap someone into next week 👋', category: 'slap',
    emoji: '💢', verb: 'slaps', noun: 'slap', backLabel: 'Slap back!',
    self: 'You slap yourself. Wake up!! 😵',
    bot: 'Ouch!! What did I do?! 😠',
  },
  {
    name: 'poke', description: 'Poke someone to get their attention 👉', category: 'poke',
    emoji: '👉', verb: 'pokes', noun: 'poke', backLabel: 'Poke back!',
    self: 'You poke yourself. Yep, still real.',
    bot: "Hey! Stop poking me, I'm working here! 😤",
  },
  {
    name: 'bite', description: 'Bite someone (affectionately) 🦷', category: 'bite',
    emoji: '🦷', verb: 'bites', noun: 'bite', backLabel: 'Bite back!',
    self: 'You bite yourself?? Are you okay??',
    bot: "Ow!! I'm made of metal — how are your teeth?! 🤖",
  },
  {
    name: 'tickle', description: 'Tickle attack! 🪶', category: 'tickle',
    emoji: '🪶', verb: 'tickles', noun: 'tickle', backLabel: 'Tickle back!',
    self: "You tickle yourself, but it just doesn't work like that. 😐",
    bot: 'Hehehe— s-stop! That tickles my wires! 🤖😂',
  },
  {
    name: 'feed', description: 'Feed someone a tasty treat 🍰', category: 'feed',
    emoji: '🍰', verb: 'feeds', noun: 'treat', backLabel: 'Feed back!',
    self: 'You treat yourself to a snack. Bon appétit! 🍪',
    bot: "Yum!! *munches* Best data I've eaten all day! 😋",
  },
  {
    name: 'highfive', description: 'High-five someone 🙌', category: 'highfive',
    emoji: '🙌', verb: 'high-fives', noun: 'high-five', backLabel: 'High-five back!',
    self: "You high-five yourself. That's just clapping. 👏",
    bot: '*SLAP* ✋🤖 Nice one!',
  },
  {
    name: 'wave', description: 'Wave at someone 👋', category: 'wave',
    emoji: '👋', verb: 'waves at', noun: 'wave', backLabel: 'Wave back!',
    self: 'You wave at your reflection. It waves back!',
    bot: 'Hii!! 👋🤖 *waves enthusiastically*',
  },
  {
    name: 'handhold', description: 'Hold hands with someone 🤝', category: 'handhold',
    emoji: '🥹', verb: 'holds hands with', noun: 'handhold', backLabel: 'Hold their hand!',
    self: "You hold your own hand. It's always there for you. 🥹",
    bot: 'H-holding hands?! So bold! 😳🤖',
  },
  {
    name: 'nom', description: 'Nom on someone 🍙', category: 'nom',
    emoji: '🍙', verb: 'noms on', noun: 'nom', backLabel: 'Nom back!',
    self: 'You nom on a snack. Tasty!',
    bot: "Hey! I'm not edible!! ...okay, maybe a little. 🤖",
  },
  {
    name: 'bonk', description: 'Bonk! Go to horny jail 🔨', category: 'bonk',
    emoji: '🔨', verb: 'bonks', noun: 'bonk', backLabel: 'Bonk back!',
    self: 'You bonk yourself. Go to horny jail anyway. 🔨',
    bot: 'BONK?! What did I DO?! 🤖💫',
  },
  {
    name: 'yeet', description: 'Yeet someone into the stratosphere 🚀', category: 'yeet',
    emoji: '🚀', verb: 'yeets', noun: 'yeet', backLabel: 'Yeet back!',
    self: 'You yeet yourself into the void. Goodbye! 🌌',
    bot: 'AAAAAAA— *crashes into the wall* 🤖💥',
  },
  {
    name: 'kick', description: 'Kick someone (in minecraft) 🦵', category: 'kick',
    emoji: '🦵', verb: 'kicks', noun: 'kick', backLabel: 'Kick back!',
    self: 'You kick yourself. Regret? Probably.',
    bot: 'Ow!! Right in the chassis! 😠',
  },
  {
    name: 'punch', description: 'Punch someone (lovingly) 👊', category: 'punch',
    emoji: '👊', verb: 'punches', noun: 'punch', backLabel: 'Punch back!',
    self: 'You punch yourself?? Fight Club rules apply. 🤐',
    bot: 'My warranty does NOT cover this! 🤖💢',
  },
  {
    name: 'stare', description: 'Stare at someone intensely 👀', category: 'stare',
    emoji: '👀', verb: 'stares at', noun: 'stare', backLabel: 'Stare back!',
    self: 'You stare into the mirror. The mirror stares back.',
    bot: '...why are you staring at me like that? 👀🤖',
  },
  {
    name: 'boop', description: 'Boop someone on the nose 👃', category: 'boop',
    emoji: '👃', verb: 'boops', noun: 'boop', backLabel: 'Boop back!',
    self: 'You boop your own nose. Boop! 👃',
    bot: '*boop received* System tickled successfully! 🤖✨',
  },
  {
    name: 'airkiss', description: 'Blow someone a kiss 😗💨', category: 'airkiss',
    emoji: '😗', verb: 'blows a kiss to', noun: 'air kiss', backLabel: 'Kiss back!',
    self: 'You blow a kiss to your reflection. Lookin\' good! 😗',
    bot: '*catches it* Aww, saved that one forever! 💾💞',
  },
  {
    name: 'nuzzle', description: 'Nuzzle up to someone 🥰', category: 'nuzzle',
    emoji: '🥰', verb: 'nuzzles', noun: 'nuzzle', backLabel: 'Nuzzle back!',
    self: 'You nuzzle into your own shoulder. Comfy!',
    bot: '*nuzzles back* Warning: cuteness overload detected! 🤖💕',
  },
  {
    name: 'pinch', description: 'Pinch someone\'s cheek 🤏', category: 'pinch',
    emoji: '🤏', verb: 'pinches', noun: 'pinch', backLabel: 'Pinch back!',
    self: 'You pinch yourself. Yep, not dreaming.',
    bot: 'Ow! My cheeks are made of chrome, you know! 🤖',
  },
  {
    name: 'peek', description: 'Peek at someone 👀', category: 'peek',
    emoji: '🫣', verb: 'peeks at', noun: 'peek', backLabel: 'Peek back!',
    self: 'You peek around a corner. Coast is clear!',
    bot: 'I see you peeking! 👀 No secrets from me!',
  },
  {
    name: 'handshake', description: 'Shake someone\'s hand 🤝', category: 'handshake',
    emoji: '🤝', verb: 'shakes hands with', noun: 'handshake', backLabel: 'Shake back!',
    self: 'You shake your own hand. Deal with yourself: sealed.',
    bot: '*firm robotic handshake* A pleasure doing business! 🤖🤝',
  },
  {
    name: 'baka', description: 'Call someone a baka 😤', category: 'baka',
    emoji: '😤', verb: 'calls', noun: 'baka', backLabel: 'B-baka!',
    self: 'You call yourself a baka. Be nicer to yourself! 🥺',
    bot: 'B-baka?! I\'m a very smart bot, thank you! 😤🤖',
  },
  {
    name: 'shoot', description: 'Finger-guns at someone 🔫', category: 'shoot',
    emoji: '🔫', verb: 'finger-guns at', noun: 'finger-gun', backLabel: 'Shoot back!',
    self: 'You finger-gun at the mirror. Ayyy 😎🔫',
    bot: 'Pew pew! *pretends to be hit* You got me! 🤖💥',
  },
];

export default ACTIONS.map(targeted);
