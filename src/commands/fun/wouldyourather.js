import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { COLORS, simpleEmbed, errorEmbed } from '../../utils/embeds.js';
import { checkAiAccess } from '../../ai/settings.js';
import { isOwner } from '../../utils/owner.js';

// Tells the AI exactly what shape to hand back so we can parse it, no matter
// how playful it gets with the wording.
const WYR_PROMPT = `You are generating one fresh "Would you rather?" question for a Discord server.
Pick two fun, distinct, roughly-balanced options that people will enjoy arguing about.
Keep each option under ~12 words. Do not repeat common cliches.
Reply with ONLY the two options on a single line, separated by " | " — nothing else, no numbering, no extra text.`;

/**
 * Splits the AI's reply into the two options. Returns null when the reply isn't
 * shaped like a valid pair, so the caller can fall back to the static list.
 * @param {string} text
 * @returns {[string, string] | null}
 */
export function parseWyrPair(text) {
  if (typeof text !== 'string') return null;
  const parts = text.split('|');
  if (parts.length !== 2) return null;
  const clean = parts.map((s) =>
    s
      .trim()
      .replace(/^["'’‘]+/, '')
      .replace(/["'’‘]+$/, '')
      .trim(),
  );
  if (!clean[0] || !clean[1]) return null;
  if (clean[0].length > 80 || clean[1].length > 80) return null;
  return clean;
}

/**
 * Asks the bot's AI for a brand-new pair of options. Returns null when the AI
 * isn't available (no key), the user has no access, or the reply can't be
 * parsed — the caller then falls back to the local list.
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {object} ctx
 * @returns {Promise<[string, string] | null>}
 */
async function aiPair(interaction, ctx) {
  if (!ctx.aiSettings?.hasApiKey()) return null;
  const access = checkAiAccess({
    isOwner: isOwner(ctx, interaction.user.id),
    userId: interaction.user.id,
    guildId: interaction.guildId,
    settings: ctx.aiSettings,
  });
  if (!access.ok) return null;

  try {
    const { text } = await ctx.aiClient.chat([
      { role: 'system', content: WYR_PROMPT },
      { role: 'user', content: 'Give me a would-you-rather question.' },
    ]);
    return parseWyrPair(text);
  } catch {
    // Any failure — timeout, rate limit, parse miss — just means we use a
    // question from the local list. No need to bother the user about it.
    return null;
  }
}

const QUESTIONS = [
  ['be able to talk to animals', 'speak every human language'],
  ['always be 10 minutes late', 'always be 20 minutes early'],
  ['have unlimited pizza for life', 'have unlimited tacos for life'],
  ['fight one horse-sized duck', 'fight a hundred duck-sized horses'],
  ['live without music', 'live without movies'],
  ['be famous but poor', 'be unknown but rich'],
  ['have a rewind button for your life', 'have a pause button for your life'],
  ['never use social media again', 'never watch another movie'],
  ['be able to fly', 'be able to turn invisible'],
  ['only whisper forever', 'only shout forever'],
  ['have hands for feet', 'have feet for hands'],
  ['know how you die', 'know when you die'],
  ['live in a world with no problems', 'live in a world where you rule'],
  ['eat only sweet food forever', 'eat only savory food forever'],
  ['always have to sing instead of speak', 'always have to dance everywhere you go'],
  ['have a personal chef', 'have a personal chauffeur'],
  ['be a cat', 'be a dog'],
  ['give up gaming for a year', 'give up snacks for a year'],
  ['be able to read minds', 'be able to see the future'],
  ['have the power to teleport', 'have the power to time travel'],
  ['never need to sleep', 'never need to eat'],
  ['be able to breathe underwater', 'be able to fly without wings'],
  ['have x-ray vision', 'have super strength'],
  ['be invisible for a day', 'be able to read minds for a day'],
  ['live in a house made of candy', 'live in a house made of gold'],
  ['have a dragon as a pet', 'have a phoenix as a pet'],
  ['be a famous actor', 'be a famous musician'],
  ['have all the money in the world but no friends', 'have all the friends in the world but no money'],
  ['be able to talk to ghosts', 'be able to talk to aliens'],
  ['have a photographic memory', 'have the ability to forget anything on command'],
  ['be able to change your appearance at will', 'be able to change your voice at will'],
  ['have a jetpack', 'have a teleportation device'],
  ['be a superhero with no sidekick', 'be a sidekick with a great superhero'],
  ['live on a tropical island forever', 'live in a big city forever'],
  ['have a pet that can talk', 'have a pet that can grant wishes'],
  ['be able to play any instrument', 'be able to speak any language'],
  ['have the ability to stop time for 10 minutes a day', 'have the ability to rewind time by 10 minutes a day'],
  ['be extremely lucky', 'be extremely smart'],
  ['have super speed', 'have super intelligence'],
  ['be able to control fire', 'be able to control water'],
  ['have a personal robot', 'have a personal wizard'],
  ['be the best at video games', 'be the best at sports'],
  ['have unlimited snacks', 'have unlimited drinks'],
  ['be able to grow any plant instantly', 'be able to fix anything instantly'],
  ['have a magic wand', 'have a magic carpet'],
  ['be able to speak with the dead', 'be able to speak with the future you'],
  ['have a third arm', 'have a tail'],
  ['be able to change your hair color at will', 'be able to change your eye color at will'],
  ['have a private island', 'have a private jet'],
  ['be able to pause time while you sleep', 'be able to dream about anything you want'],
  ['have a pet dragon', 'have a pet unicorn'],
  ['be able to breathe fire', 'be able to shoot lasers from your eyes'],
  ['have a house that can fly', 'have a car that can fly'],
  ['be the king of the world for a day', 'be invisible for a day'],
  ['have a genie that grants 3 wishes', 'have a time machine'],
  ['be able to understand animal thoughts', 'be able to understand plant feelings'],
  ['have a clone of yourself', 'have a robot version of yourself'],
  ['be able to teleport anywhere instantly', 'be able to time travel to any moment'],
  ['have unlimited energy forever', 'have unlimited money forever'],
  ['be able to see in the dark', 'be able to hear from miles away'],
  ['have the power of flight', 'have the power of invisibility'],
  ['live for 1000 years but never age', 'live a normal life but be immortal in spirit'],
  ['have a talking pet fish', 'have a talking pet parrot'],
  ['be able to create anything you imagine', 'be able to destroy anything you imagine'],
  ['have a personal chef for life', 'have a personal trainer for life'],
  ['be able to skip any boring moment', 'be able to repeat any fun moment'],
  ['have a room full of gold', 'have a room full of books'],
  ['be able to control the weather', 'be able to control the ocean tides'],
  ['have superhuman hearing', 'have superhuman sight'],
  ['be able to talk to computers', 'be able to talk to animals'],
  ['have a third eye', 'have a sixth finger'],
  ['be able to turn invisible when embarrassed', 'be able to read minds when confused'],
  ['have a magical backpack that has anything', 'have a magical box that can fix anything'],
  ['be able to shapeshift into any animal', 'be able to shapeshift into any object'],
  ['have the ability to learn anything instantly', 'have the ability to master anything instantly'],
  ['be a professional gamer', 'be a professional chef'],
  ['have a pet phoenix', 'have a pet griffin'],
  ['be able to summon rain', 'be able to summon sunshine'],
  ['have a castle in the clouds', 'have a submarine home under the sea'],
  ['be able to talk to the wind', 'be able to talk to the stars'],
  ['have a magic mirror that shows the future', 'have a magic mirror that shows the past'],
  ['be able to control gravity', 'be able to control magnetism'],
  ['have a pet that can fly', 'have a pet that can swim with you'],
  ['be able to see the world through others eyes', 'be able to hear the world through others ears'],
  ['have a million dollars today', 'have a billion dollars in 20 years'],
  ['be able to be in two places at once', 'be able to be two people at once'],
  ['have a house made of chocolate', 'have a car made of diamonds'],
  ['be able to control your dreams', 'be able to remember all your dreams'],
  ['have a personal AI assistant', 'have a personal robot servant'],
  ['be able to grow wings', 'be able to grow gills'],
  ['have the power to heal others', 'have the power to heal yourself'],
  ['be able to live under the sea', 'be able to live on the moon'],
  ['have a pet lion', 'have a pet wolf'],
  ['be able to create food out of thin air', 'be able to create water out of thin air'],
  ['have a magic door that leads anywhere', 'have a magic window that shows anywhere'],
  ['be able to communicate with dolphins', 'be able to communicate with whales'],
  ['have a personal sports car', 'have a personal yacht'],
  ['be able to fly with a cape', 'be able to turn invisible with a ring'],
  ['have a house that cleans itself', 'have a car that drives itself'],
  ['be able to grow younger', 'be able to grow older gracefully'],
  ['have a bag of infinite snacks', 'have a bottle of infinite drinks'],
  ['be able to speak to trees', 'be able to speak to mountains'],
  ['have a magic sword', 'have a magic shield'],
  ['be able to teleport to any country', 'be able to time travel to any era'],
  ['have a pet that can shapeshift', 'have a pet that can speak'],
  ['be able to make your voice sound like anyone', 'be able to make your face look like anyone'],
  ['have a crystal ball', 'have a magic wand'],
  ['be able to control time to slow down', 'be able to control time to speed up'],
  ['have a golden retriever that talks', 'have a cat that can grant wishes'],
  ['be able to be the best at cooking', 'be able to be the best at singing'],
  ['have a private movie theater', 'have a private amusement park'],
  ['be able to breathe in space', 'be able to swim to the bottom of the ocean'],
  ['have a magic bicycle', 'have a magic skateboard'],
  ['be able to read any book instantly', 'be able to watch any movie instantly'],
  ['have a personal DJ', 'have a personal comedian'],
  ['be able to turn any food into healthy food', 'be able to turn any drink into healthy drink'],
  ['have a pet phoenix that never dies', 'have a pet dragon that can fly'],
  ['be able to control gravity to fly', 'be able to control electricity to power anything'],
  ['have a mansion', 'have a penthouse'],
  ['be able to talk to the moon', 'be able to talk to the sun'],
  ['have a magic compass that points to adventure', 'have a magic map that shows treasure'],
  ['be able to shapeshift into a bird', 'be able to shapeshift into a fish'],
  ['have a personal chef on a cruise', 'have a personal chef on a mountain cabin'],
  ['be able to understand any code', 'be able to understand any language'],
  ['have a robot that does your chores', 'have a robot that does your homework'],
  ['be able to fly a plane', 'be able to drive a race car'],
  ['have a castle', 'have a space station'],
  ['be able to control fire and ice', 'be able to control earth and wind'],
  ['have a pet that is a tiny elephant', 'have a pet that is a giant hamster'],
  ['be able to read minds but only animals', 'be able to talk to plants'],
  ['have unlimited Wi-Fi', 'have unlimited battery'],
  ['be able to pause time while you eat', 'be able to rewind time while you nap'],
  ['have a personal magician', 'have a personal scientist'],
  ['be able to turn into a robot', 'be able to turn into an animal'],
  ['have a treehouse mansion', 'have an underwater palace'],
  ['be able to control your own dreams', 'be able to control others nightmares'],
  ['have a pet that follows you everywhere', 'have a pet that stays home with you'],
  ['be able to be invisible in class', 'be able to be invisible at work'],
  ['have a golden toilet', 'have a diamond bed'],
  ['be able to eat anything without gaining weight', 'be able to sleep only 2 hours a night'],
  ['have a magic mirror that shows your future', 'have a magic mirror that shows your past'],
  ['be able to talk to dinosaurs', 'be able to talk to robots'],
  ['have a pet narwhal', 'have a pet penguin'],
  ['be able to control the seasons', 'be able to control the tides'],
  ['have a personal library', 'have a personal garden'],
  ['be able to fly with a jetpack', 'be able to breathe underwater with gills'],
  ['have a magic hat that grants wishes', 'have a magic coat that keeps you warm anywhere'],
  ['be able to teleport to work', 'be able to teleport home'],
  ['have a pet wolf', 'have a pet fox'],
  ['be able to talk to your past self', 'be able to talk to your future self'],
  ['have a house on the beach', 'have a house in the mountains'],
  ['be able to control your heartbeat', 'be able to control your breathing'],
  ['have a magic camera that captures memories', 'have a magic music box that plays memories'],
  ['be able to understand all animal languages', 'be able to speak all human languages'],
  ['have a pet that can grant one wish a year', 'have a pet that can talk but sasses you'],
  ['be able to run at super speed', 'be able to jump super high'],
  ['have a personal masseuse', 'have a personal stylist'],
  ['be able to control your own luck', 'be able to control others luck'],
  ['have a robot chef', 'have a robot cleaner'],
  ['be able to shapeshift into any celebrity', 'be able to shapeshift into any fictional character'],
  ['have a private jet that flies itself', 'have a private yacht that sails itself'],
  ['be able to communicate with all insects', 'be able to communicate with all birds'],
  ['have a magic garden that grows anything', 'have a magic kitchen that cooks anything'],
  ['be able to never get sick', 'be able to never get tired'],
  ['have a pet dragon that is tiny', 'have a pet dragon that is huge'],
  ['be able to control shadows', 'be able to control light'],
  ['have a personal concert hall', 'have a personal game room'],
  ['be able to travel to any fictional world', 'be able to travel to any historical period'],
  ['have a magic pen that writes anything', 'have a magic paintbrush that paints anything'],
  ['be able to talk to your pets', 'be able to understand your pets'],
  ['have a house that floats', 'have a house that rolls'],
  ['be able to control the wind', 'be able to control the waves'],
  ['have a personal astronomer', 'have a personal oceanographer'],
  ['be able to live underwater for a day', 'be able to live in space for a day'],
  ['have a magic carpet that never runs out of energy', 'have a magic lamp that grants infinite wishes'],
  ['be able to be the best dancer', 'be able to be the best painter'],
  ['have a pet that is a giant panda', 'have a pet that is a tiny unicorn'],
  ['be able to control your dreams fully', 'be able to lucid dream every night'],
  ['have a personal bodyguard robot', 'have a personal nurse robot'],
  ['be able to speak with spirits', 'be able to speak with stars'],
  ['have a magic bag that is never empty', 'have a magic wallet that is never empty'],
  ['be able to change your past', 'be able to change your future'],
  ['have a pet dolphin', 'have a pet eagle'],
  ['be able to control your height', 'be able to control your weight'],
  ['have a personal weather machine', 'have a personal time machine'],
  ['be able to be friends with a dragon', 'be able to be friends with a giant'],
  ['have a magic key that opens any door', 'have a magic phone that calls anyone'],
  ['be able to see the world in 4K', 'be able to hear the world in surround sound'],
  ['have a personal amusement park', 'have a personal water park'],
  ['be able to talk to your favorite celebrity', 'be able to talk to your favorite fictional character'],
  ['have a pet that can fly and talk', 'have a pet that can swim and sing'],
  ['be able to control the moon', 'be able to control the stars'],
  ['have a magic violin', 'have a magic guitar'],
  ['be able to never need to shower', 'be able to never need to brush your teeth'],
  ['have a personal movie director', 'have a personal game developer'],
  ['be able to live in a video game', 'be able to live in a movie'],
  ['have a pet that is a mini dragon', 'have a pet that is a giant turtle'],
  ['be able to control your own voice', 'be able to control your own footsteps'],
  ['have a magic portal', 'have a magic mirror'],
  ['be able to make anyone laugh', 'be able to make anyone cry'],
  ['have a personal submarine', 'have a personal spaceship'],
  ['be able to control the internet', 'be able to control the electricity'],
  ['have a pet that is a talking robot', 'have a pet that is a talking animal'],
  ['be able to be the best at chess', 'be able to be the best at poker'],
  ['have a magic hourglass', 'have a magic calendar'],
  ['be able to teleport to any place you can see', 'be able to teleport to any place you can imagine'],
  ['have a personal superhero', 'have a personal supervillain'],
  ['be able to control your dreams and share them', 'be able to control your memories and edit them'],
  ['have a pet that is a wolf', 'have a pet that is a bear'],
  ['be able to grow any fruit', 'be able to grow any flower'],
  ['have a magic clock that pauses time', 'have a magic clock that speeds up time'],
  ['be able to be a professional streamer', 'be able to be a professional athlete'],
  ['have a personal castle with a moat', 'have a personal cabin in the woods'],
  ['be able to control the fog', 'be able to control the snow'],
  ['have a pet that is a baby dragon', 'have a pet that is a baby unicorn'],
  ['be able to speak to the ancient ones', 'be able to speak to the future ones'],
  ['have a magic boat', 'have a magic plane'],
  ['be able to be in any movie scene', 'be able to be in any video game level'],
  ['have a personal robot butler', 'have a personal robot chef'],
  ['be able to control your own shadow', 'be able to control your own reflection'],
  ['have a pet that is a phoenix', 'have a pet that is a griffin'],
  ['be able to hear others thoughts', 'be able to hear the sounds of the future'],
  ['have a magic compass', 'have a magic telescope'],
  ['be able to turn into a ghost', 'be able to turn into a superhero'],
  ['have a personal cloud to ride', 'have a personal wave to surf'],
  ['be able to make perfect pancakes', 'be able to make perfect coffee'],
  ['have a pet that is a tiny elephant', 'have a pet that is a giant hamster'],
  ['be able to control your sneeze', 'be able to control your hiccups'],
  ['have a magic snowglobe', 'have a magic seashell'],
  ['be able to be the smartest person alive', 'be able to be the strongest person alive'],
  ['have a personal robot friend', 'have a personal animal friend'],
  ['be able to talk to your reflection', 'be able to talk to your shadow'],
  ['have a magic star that grants wishes', 'have a magic moon that tells stories'],
  ['be able to live in a treehouse', 'be able to live in a cave'],
  ['have a pet that is a giant spider', 'have a pet that is a giant frog'],
  ['be able to control the rain', 'be able to control the sunshine'],
  ['have a personal bard', 'have a personal knight'],
  ['be able to understand the ocean', 'be able to understand the forest'],
  ['have a magic whistle', 'have a magic bell'],
  ['be able to be a hero in real life', 'be able to be a hero in a video game'],
  ['have a personal rocket', 'have a personal plane'],
  ['be able to control your own dreams fully', 'be able to edit your own memories'],
  ['have a pet that is a small dragon', 'have a pet that is a large cat'],
  ['be able to never be bored', 'be able to never be lonely'],
  ['have a magic treasure chest', 'have a magic treasure map'],
  ['be able to talk to fire', 'be able to talk to ice'],
  ['have a personal cloud castle', 'have a personal underwater cave'],
  ['be able to control your own heartbeat and breathing', 'be able to control your own dreams and fears'],
  ['have a pet that is a mini horse', 'have a pet that is a mini pig'],
  ['be able to see through walls', 'be able to hear through walls'],
  ['have a magic umbrella', 'have a magic coat'],
  ['be able to be the best driver', 'be able to be the best pilot'],
  ['have a personal robot pet', 'have a personal magical pet'],
  ['be able to control your own aging', 'be able to control your own healing'],
  ['have a magic ladder to the clouds', 'have a magic tunnel to the sea'],
  ['be able to talk to the ocean', 'be able to talk to the sky'],
  ['have a pet that is a talking lion', 'have a pet that is a talking owl'],
  ['be able to never gain weight', 'be able to never lose your hair'],
  ['have a personal teleporter', 'have a personal time machine'],
  ['be able to be a millionaire', 'be able to be a genius'],
  ['have a magic garden in the sky', 'have a magic garden underwater'],
  ['be able to control your own voice pitch', 'be able to control your own voice volume'],
  ['have a pet that is a mini dragon', 'have a pet that is a mini unicorn'],
  ['be able to talk to your future self', 'be able to talk to your past self'],
  ['have a personal lighthouse', 'have a personal observatory'],
  ['be able to control the northern lights', 'be able to control the sunrise'],
  ['have a pet that is a giant eagle', 'have a pet that is a giant whale'],
  ['be able to never get confused', 'be able to never get scared'],
  ['have a magic box of any tool', 'have a magic box of any food'],
  ['be able to be a superhero sidekick', 'be able to be a villain is henchman'],
  ['have a personal hot air balloon', 'have a personal helicopter'],
  ['be able to control your own dreams and nightmares', 'be able to control your own memories and dreams'],
  ['have a pet that is a friendly giant', 'have a pet that is a tiny friendly dragon'],
  ['be able to understand the stars', 'be able to understand the mountains'],
  ['have a magic flute', 'have a magic drum'],
  ['be able to be the best singer', 'be able to be the best actor'],
  ['have a personal planet', 'have a personal ocean'],
  ['be able to control your own fear', 'be able to control your own anger'],
  ['have a pet that is a talking parrot', 'have a pet that is a talking dog'],
  ['be able to teleport to any friend', 'be able to teleport to any family member'],
  ['have a magic apple that gives knowledge', 'have a magic apple that gives strength'],
  ['be able to live in a castle made of ice', 'be able to live in a castle made of sand'],
  ['have a personal scientist', 'have a personal wizard'],
  ['be able to control your own sneeze and cough', 'be able to control your own hunger and thirst'],
  ['have a pet that is a giant friendly snake', 'have a pet that is a giant friendly bird'],
  ['be able to see your own future', 'be able to change your own past'],
  ['have a magic seed that grows a house', 'have a magic egg that hatches a pet'],
  ['be able to be a professional magician', 'be able to be a professional acrobat'],
  ['have a personal robot to talk to', 'have a personal AI to help you'],
  ['be able to control the weather anywhere', 'be able to control the time anywhere'],
  ['have a pet that is a tiny whale', 'have a pet that is a tiny giraffe'],
  ['be able to understand all music', 'be able to understand all art'],
  ['have a magic mirror that shows your dreams', 'have a magic mirror that shows your future'],
  ['be able to be the best at math', 'be able to be the best at writing'],
  ['have a personal garden that feeds you', 'have a personal garden that heals you'],
  ['be able to control your own voice and face', 'be able to control your own body and mind'],
  ['have a pet that is a baby griffin', 'have a pet that is a baby phoenix'],
  ['be able to talk to the trees of the forest', 'be able to talk to the creatures of the sea'],
  ['have a magic backpack that makes food', 'have a magic backpack that makes tools'],
  ['be able to be a famous artist', 'be able to be a famous author'],
  ['have a personal snowmobile', 'have a personal jet ski'],
  ['be able to control your own dreams to be adventures', 'be able to control your own memories to be lessons'],
  ['have a pet that is a tiny friendly bear', 'have a pet that is a tiny friendly fox'],
  ['be able to understand the language of the wind', 'be able to understand the language of the waves'],
  ['have a magic book that writes itself', 'have a magic book that reads itself'],
  ['be able to be the best at puzzles', 'be able to be the best at riddles'],
  ['have a personal island in the sky', 'have a personal island in the sea'],
  ['be able to control your own sleep', 'be able to control your own wake'],
  ['have a pet that is a giant friendly turtle', 'have a pet that is a giant friendly rabbit'],
  ['be able to talk to the ancient spirits', 'be able to talk to the newborn stars'],
  ['have a magic wand that makes music', 'have a magic wand that makes light'],
  ['be able to be a professional explorer', 'be able to be a professional inventor'],
  ['have a personal planetarium', 'have a personal aquarium'],
  ['be able to control your own luck in games', 'be able to control your own luck in life'],
  ['have a pet that is a mini phoenix', 'have a pet that is a mini griffin'],
  ['be able to understand all the secrets of the universe', 'be able to understand all the secrets of the ocean'],
  ['have a magic clock that never runs out', 'have a magic compass that never points wrong'],
  ['be able to be the best at painting', 'be able to be the best at sculpting'],
  ['have a personal tree that grows anything', 'have a personal stone that fixes anything'],
  ['be able to control your own dreams to be epic', 'be able to control your own memories to be helpful'],
  ['have a pet that is a tiny dragon that breathes bubbles', 'have a pet that is a tiny unicorn that shoots rainbows'],
];

const POLL_TTL_MS = 24 * 60 * 60_000; // 24 hours, then the buttons expire
// messageId -> { a, b, creatorId, voters: Map<userId, 'a'|'b'>, expires }
const polls = new Map();

function prunePolls() {
  const now = Date.now();
  for (const [id, poll] of polls) if (poll.expires < now) polls.delete(id);
}

function pollRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wyr:a')
      .setLabel('🅰️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('wyr:b')
      .setLabel('🅱️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('wyr:results')
      .setLabel('Results 🔎')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Builds the live tally line shown at the bottom of the poll. The leading
 * option gets a crown; a tie crowns neither; zero votes says so.
 * @param {number} aVotes
 * @param {number} bVotes
 */
export function tallyLine(aVotes, bVotes) {
  if (aVotes === 0 && bVotes === 0) return '📊 No votes yet — be the first!';
  if (aVotes === bVotes) return `📊 **A:** ${aVotes}  ·  **B:** ${bVotes}`;
  return aVotes > bVotes
    ? `📊 **A:** ${aVotes} 👑  ·  **B:** ${bVotes}`
    : `📊 **A:** ${aVotes}  ·  **B:** ${bVotes} 👑`;
}

function pollEmbed(a, b, voters) {
  const counts = { a: 0, b: 0 };
  for (const choice of voters.values()) counts[choice]++;
  return simpleEmbed(
    COLORS.fun,
    `🤔 **Would you rather...**\n\n🅰️ ${a}\n\n**— or —**\n\n🅱️ ${b}\n\n${tallyLine(counts.a, counts.b)}`,
  );
}

/**
 * Formats who voted for what, for the poll creator's private results view.
 * @param {string} a
 * @param {string} b
 * @param {Map<string, 'a'|'b'>} voters
 */
export function resultsBreakdown(a, b, voters) {
  const groups = { a: [], b: [] };
  for (const [userId, choice] of voters) groups[choice].push(userId);
  const line = (label, option, ids) =>
    ids.length
      ? `${label} ${option} — ${ids.length} vote${ids.length === 1 ? '' : 's'}: ${ids.map((id) => `<@${id}>`).join(', ')}`
      : `${label} ${option} — no votes yet`;
  return `${line('🅰️', a, groups.a)}\n${line('🅱️', b, groups.b)}`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Get a "would you rather" question 🤔')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  async execute(interaction, ctx) {
    // Prefer a freshly-generated question from the AI; fall back to the local
    // list when the AI is off, gated, or had a hiccup.
    const [a, b] = (await aiPair(interaction, ctx)) ?? QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    await interaction.reply({ embeds: [pollEmbed(a, b, new Map())], components: [pollRow()] });

const reply = await interaction.fetchReply();
    prunePolls();
    polls.set(reply.id, { a, b, creatorId: interaction.user.id, voters: new Map(), expires: Date.now() + POLL_TTL_MS });
  },
};

/** Records a vote on a /wouldyourather poll. */
export async function handleWyrButton(interaction) {
  const poll = polls.get(interaction.message.id);

  // Expired or unknown poll: pull the buttons and tell the voter why.
  if (!poll || poll.expires < Date.now()) {
    polls.delete(interaction.message.id);
    await interaction.update({ components: [] });
    return interaction.followUp({
      embeds: [errorEmbed('This poll already ended — run `/wouldyourather` for a new one! 🤔')],
      flags: MessageFlags.Ephemeral,
    });
  }

const choice = interaction.customId.split(':')[1];

  // The creator alone gets to peek at who voted for what — everyone else is
  // told to buzz off (ephemerally, of course).
  if (choice === 'results') {
    if (interaction.user.id !== poll.creatorId) {
      return interaction.reply({
        embeds: [errorEmbed('Only the person who made this poll can peek at the results. 🤫')],
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({
      embeds: [simpleEmbed(COLORS.fun, `🤔 **Who voted**\n\n${resultsBreakdown(poll.a, poll.b, poll.voters)}`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const previous = poll.voters.get(interaction.user.id);
  if (previous) {
    return interaction.reply({
      embeds: [errorEmbed(`You already voted for **${previous === 'a' ? 'A' : 'B'}**! One vote per person. 👀`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  poll.voters.set(interaction.user.id, choice);
  poll.expires = Date.now() + POLL_TTL_MS;
  await interaction.update({ embeds: [pollEmbed(poll.a, poll.b, poll.voters)], components: [pollRow()] });
}
