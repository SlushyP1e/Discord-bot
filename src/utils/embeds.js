import { EmbedBuilder } from 'discord.js';

export const COLORS = {
  love: 0xff6fa5,
  success: 0x57f287,
  error: 0xed4245,
  info: 0x5865f2,
  fun: 0xfee75c,
};

export function loveEmbed({ description, gifUrl, footer }) {
  const embed = new EmbedBuilder().setColor(COLORS.love).setDescription(description);
  if (gifUrl) embed.setImage(gifUrl);
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

export function simpleEmbed(color, description) {
  return new EmbedBuilder().setColor(color).setDescription(description);
}

export function errorEmbed(description) {
  return simpleEmbed(COLORS.error, description);
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
