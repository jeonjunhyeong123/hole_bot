// 선언
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require("puppeteer");
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let prevStates = Array(7).fill('no-data clickable');
////////////////////////////////////////////////////////////
// 크롤링 하기
async function crawl() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            protocolTimeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-zygote',
                '--single-process'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto("https://mobigg.kr", {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });
        await page.waitForFunction(
            () => document.querySelectorAll('td.server-cell').length >= 7,
            { timeout: 10000 }
        );
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

        if (data.filter(d => d.class).length === 0) {
            await sendDiscordMessage('⚠️결과가 비어 있습니다! 네트워크 문제일 수 있습니다.');
        }
        await browser.close();
        return data;
    } catch (err) {
        await sendDiscordMessage('⚠️크롤링에 실패하였습니다.');
        throw err;
    }
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
async function initializePrevStates() {
    const data = await crawl();
    prevStates = data.map(d => d.class);
}

client.once('ready', async () => {
  console.log('봇이 준비되었습니다!');
  await initializePrevStates();
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
        const data = await Promise.race([
            crawl(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('서버가 45초 동안 응답하지 않았습니다.')), 45000))
          ]);
        if (!data || !Array.isArray(data) || data.length === 0) {
            await sendDiscordMessage('⚠️결과가 비어 있습니다! 네트워크 문제일 수 있습니다.');
            await interaction.editReply('심구 정보를 불러오지 못했습니다. 관리자에게 문의하세요.');
            return;
        }
        const info = data.map((d, i) => {
            if (d.class.includes('report-info')) {
                return `${names[i]} 남은 시간 : ${d.text}`;
            } else {
                return `${names[i]} 없음`;
            }
        }).join('\n');
        await interaction.editReply(info);
    } catch (err) {
        await interaction.editReply('정보를 가져오는 중 오류가 발생했습니다.');
        console.error(err);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);