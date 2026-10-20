import {
  ActionRowBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  InteractionContextType,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { COLORS } from '../../utils/embeds.js';

const CATEGORY_META = {
  love: { label: 'Love & reactions', emoji: '💞', blurb: 'Hugs, kisses, licks, bonks and more — with GIFs and counters!' },
  marriage: { label: 'Marriage & shipping', emoji: '💍', blurb: 'Propose, marry, divorce, ship and check love stats.' },
  fun: { label: 'Fun & games', emoji: '🎲', blurb: '8-ball, coinflips, ratings and other silliness.' },
  util: { label: 'Utility', emoji: '🛠️', blurb: 'Info about the bot, users and the server.' },
  ai: { label: 'AI chat', emoji: '🧠', blurb: 'Ask me anything — I answer with actual sass.' },
};

function overviewEmbed(client) {
  const counts = {};
  for (const cmd of client.commands.values()) {
    if (cmd.ownerOnly) continue;
    counts[cmd.category] = (counts[cmd.category] ?? 0) + 1;
  }
  const lines = Object.entries(CATEGORY_META)
    .map(([key, meta]) => `${meta.emoji} **${meta.label}** — ${meta.blurb} *(${counts[key] ?? 0} commands)*`)
    .join('\n\n');
  return new EmbedBuilder()
    .setColor(COLORS.love)
    .setTitle('💖 SlushyLove — help')
    .setDescription(`Pick a category below to see its commands!\n\n${lines}`)
    .setFooter({ text: 'Tip: most love commands have a "back!" button the other person can press 👀' });
}

function menuRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help:menu')
      .setPlaceholder('Choose a category...')
      .addOptions(
        Object.entries(CATEGORY_META).map(([key, meta]) => ({
          label: meta.label,
          value: key,
          emoji: meta.emoji,
          description: meta.blurb.slice(0, 100),
        })),
      ),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse all SlushyLove commands 💖')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  async execute(interaction) {
    await interaction.reply({ embeds: [overviewEmbed(interaction.client)], components: [menuRow()] });
  },
};

/** Handles the category select menu. */
export async function handleHelpMenu(interaction) {
  const category = interaction.values[0];
  const meta = CATEGORY_META[category];
  const commands = [...interaction.client.commands.values()]
    .filter((c) => c.category === category && !c.ownerOnly)
    .map((c) => {
      const isMenu = c.data.type === ApplicationCommandType.Message || c.data.type === ApplicationCommandType.User;
      const label = isMenu ? `**${c.data.name}** (message action)` : `**/${c.data.name}**`;
      return `${label} — ${c.help ?? c.data.description ?? 'No description'}`;
    })
    .sort();

  const embed = new EmbedBuilder()
    .setColor(COLORS.love)
    .setTitle(`${meta.emoji} ${meta.label}`)
    .setDescription(commands.join('\n') || '*No commands here yet.*');
  await interaction.update({ embeds: [embed], components: [menuRow()] });
}
