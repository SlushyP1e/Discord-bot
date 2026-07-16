// https://purrbot.site — free SFW GIF API, no key required.
export default {
  name: 'purrbot.site',
  map: {
    hug: 'hug', kiss: 'kiss', lick: 'lick', cuddle: 'cuddle', pat: 'pat',
    slap: 'slap', poke: 'poke', bite: 'bite', tickle: 'tickle',
    handhold: 'holdhands', boop: 'poke',
    dance: 'dance', blush: 'blush', cry: 'cry', pout: 'pout', smile: 'smile',
  },
  url: (cat) => `https://purrbot.site/api/img/sfw/${cat}/gif`,
  extract: (data) => data?.link,
};
