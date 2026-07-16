import { ActivityType, Events } from 'discord.js';
import { config } from '../config.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`💖 Logged in as ${client.user.tag}`);

    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'spreading love 💞 | /help', type: ActivityType.Playing }],
    });

    // integration_types: 0 = guild install, 1 = user install.
    // contexts: 0 = guild, 1 = bot DM, 2 = private channel (group DM / user-app DM).
    // Any command that already allows bot DMs is also opened up to user-install +
    // private channels so ANYONE can add SlushyLove to their account and DM it,
    // even without sharing a server. (Requires "User Install" enabled in the
    // Developer Portal → Installation.)
    const payload = [...client.commands.values()].map((c) => {
      const json = c.data.toJSON();
      if (json.contexts?.includes(1)) {
        json.contexts = [0, 1, 2];
        json.integration_types = [0, 1];
      } else {
        json.integration_types = [0];
      }
      return json;
    });
    try {
      if (config.guildId) {
        await client.application.commands.set(payload, config.guildId);
        console.log(`✅ Registered ${payload.length} commands to guild ${config.guildId} (instant)`);
      } else {
        await client.application.commands.set(payload);
        console.log(`✅ Registered ${payload.length} global commands (may take up to an hour to appear the first time)`);
      }
    } catch (err) {
      console.error('❌ Failed to register slash commands:', err);
    }
  },
};
