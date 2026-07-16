// https://nekos.life — free anime GIF API, no key required.
export default {
  name: 'nekos.life',
  map: {
    hug: 'hug', kiss: 'kiss', cuddle: 'cuddle', pat: 'pat', slap: 'slap',
    tickle: 'tickle', feed: 'feed', poke: 'poke', boop: 'poke',
    smug: 'smug',
  },
  url: (cat) => `https://nekos.life/api/v2/img/${cat}`,
  extract: (data) => data?.url,
};
