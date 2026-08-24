import { Events, MessageFlags } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';
import { checkCooldown, resetCooldown } from '../utils/cooldowns.js';
import { handleLoveBack } from '../commands/love/_factory.js';
import { handleMarriageButton } from '../commands/marriage/marry.js';
import { handleDivorceButton } from '../commands/marriage/divorce.js';
import { handleHelpMenu } from '../commands/util/help.js';
import { handleFixButton } from '../commands/util/fix.js';

async function replySafe(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch { /* interaction already gone — nothing we can do */ }
}

// Button customIds are `scope:...`; the first segment picks the handler —
// same lookup idea as the command Collection below.
const BUTTON_HANDLERS = new Map([
  ['love', handleLoveBack],
  ['marry', handleMarriageButton],
  ['divorce', handleDivorceButton],
  ['fix', handleFixButton],
]);

export default {
  name: Events.InteractionCreate,
  async execute(interaction, ctx) {
    // Set once a cooldown has been armed for this interaction, so a command
    // that throws before doing its work gets its cooldown refunded.
    let cooldownArmedFor = null;
    try {
      if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        const remaining = checkCooldown(interaction.user.id, interaction.commandName);
        if (remaining > 0) {
          return interaction.reply({
            embeds: [errorEmbed(`Whoa, slow down! Try again in **${(remaining / 1000).toFixed(1)}s** 🐢`)],
            flags: MessageFlags.Ephemeral,
          });
        }
        cooldownArmedFor = interaction.commandName;
        await command.execute(interaction, ctx);
      } else if (interaction.isButton()) {
        const [scope] = interaction.customId.split(':');
        const handler = BUTTON_HANDLERS.get(scope);
        if (handler) await handler(interaction, ctx);
      } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'help:menu') await handleHelpMenu(interaction);
      }
    } catch (err) {
      if (cooldownArmedFor) resetCooldown(interaction.user.id, cooldownArmedFor);
      console.error('Interaction error:', err);
      await replySafe(interaction, {
        embeds: [errorEmbed('Something went wrong on my end... try again in a moment! 😢')],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
