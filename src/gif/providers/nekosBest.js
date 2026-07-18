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
    // Newer reaction commands.
    handshake: 'handshake', shoot: 'shoot', baka: 'baka', peek: 'peek',
    happy: 'happy', yawn: 'yawn', thumbsup: 'thumbsup',
  },
  url: (cat) => `https://nekos.best/api/v2/${cat}?amount=1`,
  // nekos.best is the only provider that reports the source anime.
  extract: (data) => ({ url: data?.results?.[0]?.url, anime: data?.results?.[0]?.anime_name }),
};
