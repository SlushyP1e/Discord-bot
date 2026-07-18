// https://otakugifs.xyz — free anime reaction GIF API, no key required.
export default {
  name: 'otakugifs.xyz',
  map: {
    hug: 'hug', kiss: 'kiss', lick: 'lick', cuddle: 'cuddle', pat: 'pat',
    slap: 'slap', poke: 'poke', bite: 'bite', tickle: 'tickle', nom: 'nom',
    punch: 'punch', stare: 'stare', wave: 'wave', handhold: 'handhold',
    highfive: 'brofist', boop: 'poke',
    dance: 'dance', blush: 'blush', cry: 'cry', laugh: 'laugh', smile: 'smile',
    wink: 'wink', pout: 'pout', smug: 'smug', sleep: 'sleepy', shrug: 'shrug',
    facepalm: 'facepalm',
    // Newer reaction commands.
    airkiss: 'airkiss', nuzzle: 'nuzzle', pinch: 'pinch', peek: 'peek',
    happy: 'happy', celebrate: 'celebrate', clap: 'clap', cheers: 'cheers',
    shy: 'shy', nervous: 'nervous', yawn: 'yawn', thumbsup: 'thumbsup',
  },
  url: (cat) => `https://api.otakugifs.xyz/gif?reaction=${cat}`,
  extract: (data) => ({ url: data?.url }),
};
