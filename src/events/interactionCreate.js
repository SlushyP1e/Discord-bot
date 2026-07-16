import { Events, MessageFlags } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';
import { checkCooldown } from '../utils/cooldowns.js';
import { handleLoveBack } from '../commands/love/_factory.js';
import { handleMarriageButton } from '../commands/marriage/marry.js';
import { handleDivorceButton } from '../commands/marriage/divorce.js';
import { handleHelpMenu } from '../commands/util/help.js';

async function replySafe(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch { /* interaction already gone — nothing we can do */ }
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction, ctx) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        const remaining = checkCooldown(interaction.user.id, interaction.commandName);
        if (remaining > 0) {
          return interaction.reply({
            embeds: [errorEmbed(`Whoa, slow down! Try again in **${(remaining / 1000).toFixed(1)}s** 🐢`)],
            flags: MessageFlags.Ephemeral,
          });
        }
        await command.execute(interaction, ctx);
      } else if (interaction.isButton()) {
        const [scope] = interaction.customId.split(':');
        if (scope === 'love') await handleLoveBack(interaction, ctx);
        else if (scope === 'marry') await handleMarriageButton(interaction, ctx);
        else if (scope === 'divorce') await handleDivorceButton(interaction, ctx);
      } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'help:menu') await handleHelpMenu(interaction);
      }
    } catch (err) {
      console.error('Interaction error:', err);
      await replySafe(interaction, {
        embeds: [errorEmbed('Something went wrong on my end... try again in a moment! 😢')],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
