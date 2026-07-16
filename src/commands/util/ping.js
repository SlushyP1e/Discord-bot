import { InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if SlushyLove is awake 🏓')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  async execute(interaction) {
    const sent = await interaction.reply({
      embeds: [simpleEmbed(COLORS.info, '🏓 Pinging...')],
      withResponse: true,
    });
    const roundtrip = sent.resource.message.createdTimestamp - interaction.createdTimestamp;
    const ws = Math.max(0, Math.round(interaction.client.ws.ping));
    await interaction.editReply({
      embeds: [simpleEmbed(COLORS.info, `🏓 Pong! Roundtrip **${roundtrip} ms** · Gateway **${ws} ms**`)],
    });
  },
};
