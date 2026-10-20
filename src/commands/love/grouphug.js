import { SlashCommandBuilder } from 'discord.js';
import { COLORS, loveEmbed, simpleEmbed } from '../../utils/embeds.js';
import { DM_AND_GUILD, scopeId } from '../../utils/scope.js';

const TYPES = {
  hug: { emoji: '🫂', verb: 'pulls', into: 'a big group hug', noun: 'hug', past: 'hugged' },
  cuddle: { emoji: '🥰', verb: 'gathers', into: 'a giant cuddle pile', noun: 'cuddle', past: 'cuddled' },
};

// "B", "B and C", "B, C and D"
function joinNames(names) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const builder = new SlashCommandBuilder()
  .setName('grouphug')
  .setDescription('Pull a whole group into one big hug 🫂')
  .setContexts(DM_AND_GUILD)
  .addUserOption((o) => o.setName('user1').setDescription('First person').setRequired(true));
for (let i = 2; i <= 5; i++) {
  builder.addUserOption((o) => o.setName(`user${i}`).setDescription(`Person ${i} (optional)`));
}
builder.addStringOption((o) =>
  o.setName('type').setDescription('Hug or cuddle? (default: hug)').addChoices(
    { name: 'hug', value: 'hug' },
    { name: 'cuddle', value: 'cuddle' },
  ),
);

export default {
  data: builder,
  async execute(interaction, ctx) {
    const type = TYPES[interaction.options.getString('type') ?? 'hug'];

    // Collect distinct targets, excluding the caller and the bot.
    const seen = new Set([interaction.user.id, interaction.client.user.id]);
    const targets = [];
    for (let i = 1; i <= 5; i++) {
      const user = interaction.options.getUser(`user${i}`);
      if (user && !seen.has(user.id)) {
        seen.add(user.id);
        targets.push(user);
      }
    }

    if (targets.length === 0) {
      return interaction.reply({
        embeds: [simpleEmbed(COLORS.fun, 'You can\'t group hug just yourself (or me)! Pick some actual people. 🫂')],
      });
    }

    await interaction.deferReply();
    const gif = await ctx.gifService.getGif(type.noun);

    const scope = scopeId(interaction);
    for (const target of targets) {
      ctx.db.interactions.increment(scope, interaction.user.id, target.id, type.noun);
    }

    const names = joinNames(targets.map((t) => `**${t.displayName}**`));
    const footerParts = [`${targets.length} ${targets.length === 1 ? 'person' : 'people'} ${type.past} 💞`];
    if (gif?.anime) footerParts.push(`Anime: ${gif.anime}`);

    const embed = loveEmbed({
      description: `${type.emoji} **${interaction.user.displayName}** ${type.verb} ${names} into ${type.into}!`,
      gifUrl: gif?.url,
      footer: footerParts.join(' • '),
    });
    if (!gif) {
      embed.setDescription(
        `${embed.data.description}\n\n*(all my GIF sources are napping right now, but the ${type.noun} still counts! 😴)*`,
      );
    }
    await interaction.editReply({ embeds: [embed] });
  },
};
