// https://otakugifs.xyz — free anime reaction GIF API, no key required.
export default {
  name: 'otakugifs.xyz',
  map: {
    hug: 'hug', kiss: 'kiss', lick: 'lick', cuddle: 'cuddle', pat: 'pat',
    slap: 'slap', poke: 'poke', bite: 'bite', tickle: 'tickle', nom: 'nom',
    punch: 'punch', stare: 'stare', wave: 'wave', handhold: 'handhold',
    highfive: 'brofist', boop: 'poke',
    dance: 'dance', blush: 'blush', cry: 'cry', laugh: 'laugh', smile: 'smile',
    wink: 'wink', pout: 'pout', smug: 'smug', sleep: 'sleep', shrug: 'shrug',
    facepalm: 'facepalm',
  },
  url: (cat) => `https://api.otakugifs.xyz/gif?reaction=${cat}`,
  extract: (data) => data?.url,
};
