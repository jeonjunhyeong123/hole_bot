// 선언
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require("puppeteer");
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let prevStates = Array(7).fill('no-data clickable');
////////////////////////////////////////////////////////////
// 크롤링 하기
async function crawl() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://mobigg.kr", { waitUntil: "networkidle2" });
    await page.waitForSelector("td.server-cell");
  
    const data = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll("td.server-cell")).slice(0,7);
      return cells.map(cell => {
        const div = cell.querySelector('div');
        return {
          class: div ? div.className : '',
          text: div ? div.innerText.trim() : ''
        };
      });
    });
  
    await browser.close();
    return data;
}
////////////////////////////////////////////////////////////
// 메세지 보내는 함수
async function sendDiscordMessage(message) {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    channel.send(message); 
}
////////////////////////////////////////////////////////////
// 변화 감지 및 멘션
const roleIds = [
    process.env.DISCORD_ROLE_ID_ALISSA,
    process.env.DISCORD_ROLE_ID_MEVEN,
    process.env.DISCORD_ROLE_ID_LASSAR,
    process.env.DISCORD_ROLE_ID_CALIX,
    process.env.DISCORD_ROLE_ID_DEIAN,
    process.env.DISCORD_ROLE_ID_AEIRA,
    process.env.DISCORD_ROLE_ID_DUNCAN
  ];

async function checkAndNotify() {
  const data = await crawl();
  for (let i = 0; i < 7; i++) {
    if (
      prevStates[i] === 'no-data clickable' &&
      data[i].class.includes('report-info clickable')
    ) {
      const roleId = roleIds[i];
      const message = `<@&${roleId}> 심구 떴다 일어나!`;
      await sendDiscordMessage(message);
    }
    prevStates[i] = data[i].class;
  }
}
////////////////////////////////////////////////////////////
// 봇 연결하기
client.once('ready', () => {
  console.log('봇이 준비되었습니다!');
  setInterval(checkAndNotify, 60 * 1000);
});
////////////////////////////////////////////////////////////
// 커맨드 처리
const names = ['알리사', '메이븐', '라사', '칼릭스', '데이안', '아이라', '던컨'];
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === '심구') {
    await interaction.deferReply();
    try {
        const data = await crawl();
        const info = data.map((d, i) => {
            if (d.class.includes('report-info')) {
                return `${names[i]} 남은 시간 : ${d.text}`;
            } else {
                return `${names[i]} 없음`;
            }
        }).join('\n');
        await interaction.editReply(info);
    } catch (err) {
        await interaction.editReply('크롤링 중 오류가 발생했습니다.');
        console.error(err);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);