import { mood } from './_factory.js';

// Solo expression commands — no target, just you and a GIF.
const MOODS = [
  { name: 'dance', description: 'Bust a move 💃', category: 'dance', emoji: '💃', verb: 'is dancing!' },
  { name: 'blush', description: 'Blush furiously 😊', category: 'blush', emoji: '😊', verb: 'is blushing!' },
  { name: 'cry', description: 'Let it all out 😢', category: 'cry', emoji: '😢', verb: 'is crying... someone give them a hug!' },
  { name: 'laugh', description: 'Crack up laughing 😂', category: 'laugh', emoji: '😂', verb: 'is cracking up!' },
  { name: 'smile', description: 'Smile brightly 😄', category: 'smile', emoji: '😄', verb: 'is smiling brightly!' },
  { name: 'wink', description: 'Wink at the chat 😉', category: 'wink', emoji: '😉', verb: 'winks!' },
  { name: 'pout', description: 'Pout dramatically 😾', category: 'pout', emoji: '😾', verb: 'is pouting...' },
  { name: 'smug', description: 'Look extremely smug 😏', category: 'smug', emoji: '😏', verb: 'looks SO smug right now...' },
  { name: 'sleep', description: 'Zzz... 😴', category: 'sleep', emoji: '😴', verb: 'fell asleep... shhh!' },
  { name: 'shrug', description: '¯\\_(ツ)_/¯ 🤷', category: 'shrug', emoji: '🤷', verb: 'shrugs. ¯\\_(ツ)_/¯' },
  { name: 'facepalm', description: 'Facepalm at the chat 🤦', category: 'facepalm', emoji: '🤦', verb: 'facepalms.' },
];

export default MOODS.map(mood);
