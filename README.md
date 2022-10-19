<h1 id="title">🤖 MineRank</h1>

<img src="https://user-images.githubusercontent.com/34401005/196668897-6d98bae8-a76a-4bd8-aef3-eb9aab473d7a.png" height=150 id="icon"></img>

> MineRank is a Discord bot built with TypeScript, discord.js & uses [DKRCommands](https://github.com/karelkryda/DKRCommands) Command Handler <br>
> It attaches your discord account to a minecraft account.

## Requirements

1. Discord Bot Token **[Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)**  
2. Node.js 17.0.0 or newer

## 🚀 Getting Started

```shell
git clone https://github.com/dgudim/Discord-minerank-bot
cd Discord-minerank-bot
npm install
```

After installation finishes follow configuration instructions then run `npm run start` to start the bot.

## ⚙️ Configuration

Create a .env file in the same directory as the bot, fill in required variables

⚠️ **Note: Never commit or share your token or api keys publicly** ⚠️

`.env`
```ruby

TEST_SERVERS=<server1>,<server2>,<server3>,...
OWNERS=<owner1>,<owner2>,...

RANK_UPDATE_INTERVAL_MINUTES=<update interval (default is every 10 minutes)>
LOOKUP_SERVER=<your minecraft server address>

RANK_PLUGIN_CONFIG_PATH=<RankSystem config path (config.yml)>
CLAN_PLUGIN_CONFIG_PATH=<ClansLite config file path (clans.yml)>

TOKEN=<discord bot token>

CLAN_CHANNELS_CATEGORY=<Category name for autocreated clan channels>
```

## 📝 Features
  1. Integrates with [ClansLite](https://www.spigotmc.org/resources/clanslite-1-19-support.97163/) plugin and syncs clans with discord, creates personal voice and text channel per clan
  2. Integrates with [RankSystem](https://github.com/HSBEST13/RankSystem) minecraft plugin and syncs ranks with discord
  3. `/leaderboard` and `/clan_leaderboard` commands to view the leaderbords
  4. `/status` command to see basic information about your minecraft server
  5. Displays player count in it's status
  
<img src="https://user-images.githubusercontent.com/34401005/196669805-93e9771e-217c-4bd7-acea-400ad26986ad.png" height=300 id="thumb"></img>
