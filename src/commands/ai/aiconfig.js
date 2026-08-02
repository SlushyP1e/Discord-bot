import { EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { COLORS, simpleEmbed, errorEmbed } from '../../utils/embeds.js';
import { requireOwner } from '../../utils/owner.js';

// Owner-only control panel for the /ask brain: which provider/key to use, and
// which servers are allowed to use it.
//
// Everything here replies ephemerally. Slash-command options are never posted
// into the channel (only the invoker's own client shows what they typed), so
// the API key is never left sitting in a message anyone could read.

const ephemeral = { flags: MessageFlags.Ephemeral };

export default {
  // Hidden from /help — nobody but the owner can run it anyway.
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('aiconfig')
    .setDescription('Owner: configure my AI brain 🧠')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .addSubcommand((s) =>
      s
        .setName('key')
        .setDescription('Set the AI API key (and optionally the model / provider)')
        .addStringOption((o) =>
          o.setName('api_key').setDescription('Your DeepSeek (or other) API key — never shown again').setRequired(true),
        )
        .addStringOption((o) =>
          o.setName('model').setDescription('Model name, e.g. deepseek-chat'),
        )
        .addStringOption((o) =>
          o.setName('base_url').setDescription('OpenAI-compatible base URL, e.g. https://api.deepseek.com'),
        )
        .addStringOption((o) =>
          o.setName('provider').setDescription('Label for the provider, e.g. deepseek'),
        ),
    )
    .addSubcommand((s) => s.setName('clearkey').setDescription('Forget the stored API key (turns /ask off)'))
    .addSubcommand((s) =>
      s
        .setName('allow')
        .setDescription('Allow a server to use /ask')
        .addStringOption((o) =>
          o.setName('server_id').setDescription('Server ID (defaults to this server)'),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('disallow')
        .setDescription('Stop a server from using /ask')
        .addStringOption((o) =>
          o.setName('server_id').setDescription('Server ID (defaults to this server)'),
        ),
    )
    .addSubcommand((s) => s.setName('servers').setDescription('List the servers allowed to use /ask'))
    .addSubcommand((s) =>
      s
        .setName('persona')
        .setDescription('Add extra personality notes (leave empty to reset)')
        .addStringOption((o) =>
          o.setName('text').setDescription('Extra personality notes — safety rules always still apply').setMaxLength(1500),
        ),
    )
    .addSubcommand((s) => s.setName('status').setDescription('Show the current AI setup')),

  async execute(interaction, ctx) {
    if (!(await requireOwner(interaction, ctx))) return;

    const settings = ctx.aiSettings;
    const sub = interaction.options.getSubcommand();

    // Server ID for allow/disallow: an explicit one wins, otherwise "here".
    const targetGuild = () => interaction.options.getString('server_id')?.trim() || interaction.guildId;

    switch (sub) {
      case 'key': {
        const baseUrl = interaction.options.getString('base_url');
        if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
          return interaction.reply({
            embeds: [errorEmbed('`base_url` has to start with `http://` or `https://`.')],
            ...ephemeral,
          });
        }
        settings.setProvider({
          apiKey: interaction.options.getString('api_key'),
          model: interaction.options.getString('model'),
          provider: interaction.options.getString('provider'),
          baseUrl,
        });
        return interaction.reply({
          embeds: [
            simpleEmbed(
              COLORS.success,
              '✅ AI brain connected — it works from the very next `/ask`, no restart needed.\n' +
                `• **Provider:** ${settings.provider}\n` +
                `• **Base URL:** ${settings.baseUrl}\n` +
                `• **Model:** ${settings.model}\n` +
                `• **Key:** stored ${settings.keyEncrypted ? '**encrypted** 🔒' : 'in my database'} — never shown anywhere.` +
                (settings.keyEncrypted ? '' : '\n\n*Tip: set `CONFIG_SECRET` in your `.env` to encrypt it at rest.*'),
            ),
          ],
          ...ephemeral,
        });
      }

      case 'clearkey': {
        settings.clearApiKey();
        const stillHasEnvKey = settings.hasApiKey();
        return interaction.reply({
          embeds: [
            simpleEmbed(
              COLORS.success,
              stillHasEnvKey
                ? '🗑️ Forgot the saved key — I fell back to the `AI_API_KEY` from your environment.'
                : '🗑️ Forgot my API key. `/ask` is off until you set a new one.',
            ),
          ],
          ...ephemeral,
        });
      }

      case 'allow': {
        const guildId = targetGuild();
        if (!guildId) {
          return interaction.reply({
            embeds: [errorEmbed('Run this in the server you want to allow, or pass `server_id`.')],
            ...ephemeral,
          });
        }
        const added = settings.allowGuild(guildId, interaction.user.id);
        const name = interaction.client.guilds.cache.get(guildId)?.name;
        return interaction.reply({
          embeds: [
            simpleEmbed(
              COLORS.success,
              added
                ? `✅ **${name ?? guildId}** can now use \`/ask\`.`
                : `**${name ?? guildId}** was already allowed 👍`,
            ),
          ],
          ...ephemeral,
        });
      }

      case 'disallow': {
        const guildId = targetGuild();
        if (!guildId) {
          return interaction.reply({
            embeds: [errorEmbed('Run this in the server you want to block, or pass `server_id`.')],
            ...ephemeral,
          });
        }
        const removed = settings.disallowGuild(guildId);
        const name = interaction.client.guilds.cache.get(guildId)?.name;
        return interaction.reply({
          embeds: [
            simpleEmbed(
              removed ? COLORS.success : COLORS.info,
              removed
                ? `🚫 **${name ?? guildId}** can no longer use \`/ask\`.`
                : `**${name ?? guildId}** wasn't on the list anyway.`,
            ),
          ],
          ...ephemeral,
        });
      }

      case 'servers': {
        const ids = settings.allowedGuilds();
        const lines = ids.map((id) => {
          const guild = interaction.client.guilds.cache.get(id);
          return guild ? `• **${guild.name}** — \`${id}\`` : `• \`${id}\` *(I'm not in this server)*`;
        });
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('🧠 Servers allowed to use /ask')
              .setDescription(
                lines.join('\n') ||
                  "*Nobody yet.* Run `/aiconfig allow` in a server to switch `/ask` on there.\n" +
                    'Until then only you can use it.',
              ),
          ],
          ...ephemeral,
        });
      }

      case 'persona': {
        const text = interaction.options.getString('text');
        settings.setPersona(text);
        return interaction.reply({
          embeds: [
            simpleEmbed(
              COLORS.success,
              text?.trim()
                ? `✅ Personality notes saved:\n>>> ${text.trim().slice(0, 1000)}`
                : '✅ Back to my default personality 💖',
            ),
          ],
          ...ephemeral,
        });
      }

      default: {
        const allowed = settings.allowedGuilds();
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle('🧠 AI status')
              .addFields(
                { name: 'API key', value: settings.hasApiKey() ? `✅ set${settings.keyEncrypted ? ' 🔒' : ''}` : '❌ missing', inline: true },
                { name: 'Provider', value: settings.provider, inline: true },
                { name: 'Model', value: settings.model, inline: true },
                { name: 'Base URL', value: settings.baseUrl },
                { name: 'Allowed servers', value: `${allowed.length}`, inline: true },
                { name: 'Granted people', value: `${settings.allowedUsers().length}`, inline: true },
                { name: 'Extra persona', value: settings.persona ? '✅ set' : '— default —', inline: true },
              )
              .setFooter({ text: 'Only you can see or change any of this.' }),
          ],
          ...ephemeral,
        });
      }
    }
  },
};
