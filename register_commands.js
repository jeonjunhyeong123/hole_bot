require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// 슬래시 커맨드 등록
const commands = [
    new SlashCommandBuilder().setName('심구').setDescription('심층 검은 구멍 현황')
  ].map(command => command.toJSON());
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  rest.put(
    Routes.applicationCommands(process.env.APPLICATION_ID),
    { body: commands }
  );