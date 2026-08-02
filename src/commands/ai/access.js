import { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed, errorEmbed } from '../../utils/embeds.js';
import { requireOwner } from '../../utils/owner.js';

// Owner-only: hand /ask to a specific person, everywhere.
//
// A grant here outranks the server allow-list entirely. The person can use
// /ask in DMs with the bot, in any server it's in, and — once they've added
// SlushyLove to their own account — in servers it isn't in at all.

const ephemeral = { flags: MessageFlags.Ephemeral };

export default {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('access')
    .setDescription('Owner: give someone /ask access anywhere 🎟️')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addSubcommand((s) =>
      s
        .setName('give')
        .setDescription('Let this person use /ask anywhere, DMs included')
        .addUserOption((o) => o.setName('user').setDescription('Who to give access to').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Take back someone\'s access')
        .addUserOption((o) => o.setName('user').setDescription('Who to remove').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('list').setDescription('Everyone with personal /ask access')),

  async execute(interaction, ctx) {
    if (!(await requireOwner(interaction, ctx))) return;

    const settings = ctx.aiSettings;
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const ids = settings.allowedUsers();
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🎟️ People with /ask access anywhere')
            .setDescription(
              ids.map((id) => `• <@${id}> — \`${id}\``).join('\n') ||
                '*Nobody yet.* Use `/access give` to hand someone the keys.\n' +
                  'Everyone else can only use `/ask` in allow-listed servers.',
            )
            .setFooter({ text: 'This is on top of /aiconfig servers, not instead of it.' }),
        ],
        ...ephemeral,
      });
    }

    const user = interaction.options.getUser('user', true);
    if (user.bot) {
      return interaction.reply({
        embeds: [errorEmbed("Bots don't need an allowance 🤖")],
        ...ephemeral,
      });
    }

    if (sub === 'give') {
      const added = settings.allowUser(user.id, interaction.user.id);
      return interaction.reply({
        embeds: [
          simpleEmbed(
            COLORS.success,
            added
              ? `✅ **${user.username}** can now use \`/ask\` anywhere — DMs, any server, ` +
                'and servers I\'m not even in once they add me to their account.\n\n' +
                '*They may need to add me: right-click my profile → **Add App**.*'
              : `**${user.username}** already had access 👍`,
          ),
        ],
        ...ephemeral,
      });
    }

    const removed = settings.disallowUser(user.id);
    return interaction.reply({
      embeds: [
        simpleEmbed(
          removed ? COLORS.success : COLORS.info,
          removed
            ? `🚫 Took **${user.username}**'s access away. They can still use \`/ask\` in allow-listed servers.`
            : `**${user.username}** didn't have personal access anyway.`,
        ),
      ],
      ...ephemeral,
    });
  },
};
