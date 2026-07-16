// https://waifu.pics — free anime GIF API, no key required (SFW endpoints only).
export default {
  name: 'waifu.pics',
  map: {
    hug: 'hug', kiss: 'kiss', lick: 'lick', cuddle: 'cuddle', pat: 'pat',
    slap: 'slap', poke: 'poke', bite: 'bite', nom: 'nom', bonk: 'bonk',
    yeet: 'yeet', kick: 'kick', highfive: 'highfive', handhold: 'handhold',
    wave: 'wave', boop: 'poke',
    dance: 'dance', blush: 'blush', cry: 'cry', smile: 'smile', wink: 'wink',
    smug: 'smug',
  },
  url: (cat) => `https://api.waifu.pics/sfw/${cat}`,
  extract: (data) => data?.url,
};
