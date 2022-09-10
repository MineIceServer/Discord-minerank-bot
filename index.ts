import { join } from "path";

import { Client, GatewayIntentBits } from "discord.js";
import DKRCommands from "dkrcommands";

import * as mysql from "mysql";
import YAML from 'yaml'
import { colors, error, info, wrap, getBaseLog, hsvToRgb } from "discord_bots_common";

import dotenv from 'dotenv'; // evironment vars
import fs from 'fs';

dotenv.config();

let tableName: string;
let chatActivityRatio: number;
let gameActivityRatio: number;

const client = new Client({
    rest: {
        timeout: 60000,
        retries: 3
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.on("ready", () => {
    //new DKRCommands(client, {
    //    // The name of the local folder for your command files
    //    commandsDir: join(__dirname, "commands"),
    //    // Allow importing of .ts files if you are using ts-node
    //    typeScript: true
    //});
    
    if (!fs.existsSync(process.env.CONFIG_PATH || "")) {
        error(`invalid config path!`);
        process.exit(1);
    }

    const data = YAML.parse(fs.readFileSync(process.env.CONFIG_PATH!).toString());
    chatActivityRatio = data.chatActivityRatio || 0;
    gameActivityRatio = data.gameActivityRatio || 0;

    if (!data.db.host || !data.db.port || !data.db.dbName || !data.db.login || !data.db.password || !data.tableName) {
        error(`invalid dtabase config!`);
        process.exit(1);
    }

    tableName = data.tableName;

    let dbConnection = mysql.createConnection({
        host: data.db.host,
        port: parseInt(data.db.port),
        database: data.db.dbName,
        user: data.db.login,
        password: data.db.password
    });

    dbConnection.connect(function (err) {
        if (err) {
            error(err);
            process.exit(2);
        }
        info(`Connected to the MySQL db ${wrap(data.db.dbName, colors.LIGHTER_BLUE)} on ${wrap(data.db.host, colors.LIGHT_GREEN)}`);
    });

    dbConnection.query(`SELECT ds_nickname, chat_activity, game_activity from ${tableName}`, async function (err, results, fields) {
        if (err) {
            error(`${err.message}: ${err.message}`);
            return;
        }

        const guilds = await client.guilds.fetch();
        info("currently serving guilds: ");
        for (let guild of guilds) {
            info(`${guild[0]} (${wrap(guild[1], colors.LIGHT_YELLOW)})` );
        }
        for (let entry of results) {
        
            if (!entry.ds_nickname) {
                continue;
            }

            const activity = chatActivityRatio * entry.chat_activity + gameActivityRatio * entry.game_activity;
            let rank = Math.floor(getBaseLog(5, activity + 1));
            let rank_str = `Rank ${rank}`;
            info(`found user: ${wrap(entry.ds_nickname, colors.BLUE)}, rank: ${wrap(rank, colors.GREEN)}`);
            

            for (let guild of guilds) {
                let guild_sync = await guild[1].fetch();

                let role = guild_sync.roles.cache.find(role => role.name === rank_str);
                if(!role) {
                    info(`created rank role: ${wrap(rank_str, colors.LIGHTER_BLUE)}`);
                    role = await guild_sync.roles.create({
                        name: `Rank ${rank}`,
                        color: hsvToRgb((rank / 20.0) % 1, 0.7, 0.9)
                    });
                }

                let member = (await guild_sync.members.fetch({ query: entry.ds_nickname, limit: 1, withPresences: true })).at(0);
                (await member?.createDM())?.send(`test ${member}`);
                let previous_role = member?.roles.cache.find(role => role.name.startsWith("Rank"));
                if (previous_role != role) {
                    //remove previous role
                    if (previous_role) {
                        info(`${wrap("removed", colors.LIGHT_RED)} role ${previous_role.name} from user ${wrap(member?.user.tag, colors.LIGHT_RED)}`);
                        member?.roles.remove(previous_role);
                    }
                    info(`${wrap("added", colors.LIGHT_GREEN)} role ${wrap(role.name, colors.GREEN)} to user ${wrap(member?.user.tag, colors.BLUE)}`);
                    // add the new role
                    member?.roles.add(role);
                }
            }        
        }

    });

    dbConnection.end();

});

client.login(process.env.TOKEN);
