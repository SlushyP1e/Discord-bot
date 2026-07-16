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

    const payload = [...client.commands.values()].map((c) => c.data.toJSON());
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
