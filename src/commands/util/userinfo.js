import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Info about a server member 👤')
    .setContexts(InteractionContextType.Guild)
    .addUserOption((o) => o.setName('user').setDescription('Who to look up (default: you)')),
  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`👤 ${user.displayName}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Username', value: user.username, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
    if (member) {
      embed.addFields(
        { name: 'Joined server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'Roles', value: `${member.roles.cache.size - 1}`, inline: true },
      );
    }
    await interaction.reply({ embeds: [embed] });
  },
};
