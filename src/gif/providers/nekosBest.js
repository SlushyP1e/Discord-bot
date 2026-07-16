// https://nekos.best — free anime GIF API, no key required.
export default {
  name: 'nekos.best',
  map: {
    hug: 'hug', kiss: 'kiss', cuddle: 'cuddle', pat: 'pat', slap: 'slap',
    poke: 'poke', bite: 'bite', tickle: 'tickle', feed: 'feed', highfive: 'highfive',
    wave: 'wave', handhold: 'handhold', nom: 'nom', yeet: 'yeet', kick: 'kick',
    punch: 'punch', stare: 'stare', boop: 'poke',
    dance: 'dance', blush: 'blush', cry: 'cry', laugh: 'laugh', smile: 'smile',
    wink: 'wink', pout: 'pout', smug: 'smug', sleep: 'sleep', shrug: 'shrug',
    facepalm: 'facepalm',
  },
  url: (cat) => `https://nekos.best/api/v2/${cat}?amount=1`,
  extract: (data) => data?.results?.[0]?.url,
};
