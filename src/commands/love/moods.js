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
  { name: 'happy', description: 'Radiate happiness 😊', category: 'happy', emoji: '😊', verb: 'is so happy right now!' },
  { name: 'celebrate', description: 'Celebrate something! 🎉', category: 'celebrate', emoji: '🎉', verb: 'is celebrating!' },
  { name: 'clap', description: 'Give a round of applause 👏', category: 'clap', emoji: '👏', verb: 'is clapping!' },
  { name: 'cheers', description: 'Cheers! 🥂', category: 'cheers', emoji: '🥂', verb: 'raises a glass. Cheers!' },
  { name: 'shy', description: 'Feel a little shy 😳', category: 'shy', emoji: '😳', verb: 'is feeling shy...' },
  { name: 'nervous', description: 'Get a little nervous 😰', category: 'nervous', emoji: '😰', verb: 'is looking nervous...' },
  { name: 'yawn', description: 'Yawn... 🥱', category: 'yawn', emoji: '🥱', verb: 'lets out a big yawn.' },
  { name: 'thumbsup', description: 'Give a thumbs up 👍', category: 'thumbsup', emoji: '👍', verb: 'gives a big thumbs up!' },
];

export default MOODS.map(mood);
