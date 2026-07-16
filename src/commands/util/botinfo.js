import { EmbedBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../utils/embeds.js';

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Stats and GIF provider health for SlushyLove 🤖')
    .setContexts(InteractionContextType.Guild),
  async execute(interaction, ctx) {
    const { client } = interaction;
    const providerLines = ctx.gifService
      .getStatus()
      .map((p) => `${p.up ? '🟢' : '🔴'} ${p.name}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('🤖 SlushyLove')
      .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: '⏱️ Uptime', value: formatUptime(client.uptime), inline: true },
        { name: '🏠 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '📶 Ping', value: `${Math.max(0, Math.round(client.ws.ping))} ms`, inline: true },
        { name: '🧠 Memory', value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`, inline: true },
        { name: '⚙️ Node', value: process.version, inline: true },
        { name: '💞 Commands', value: `${client.commands.size}`, inline: true },
        { name: '🖼️ GIF providers (failover order)', value: providerLines },
      )
      .setFooter({ text: 'If a provider goes red, I automatically fall back to the next one 💪' });
    await interaction.reply({ embeds: [embed] });
  },
};
