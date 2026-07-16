import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Info about this server 🏠')
    .setContexts(InteractionContextType.Guild),
  async execute(interaction) {
    const { guild } = interaction;
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`🏠 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Boosts', value: `${guild.premiumSubscriptionCount ?? 0} (level ${guild.premiumTier})`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
