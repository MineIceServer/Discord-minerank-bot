import { Client, GatewayIntentBits } from "discord.js";

import path from "path";

import * as mysql from "mysql";
import YAML from 'yaml'
import { colors, error, info, wrap } from "discord_bots_common";

import dotenv from 'dotenv'; // evironment vars
import fs from 'fs';
import { updateAllRanks } from "./role_utils";
import { DKRCommands } from "dkrcommands";

dotenv.config();

export let tableName: string;
export let chatActivityRatio: number;
export let gameActivityRatio: number;
export let dbConnection: mysql.Connection;

const client = new Client({
    rest: {
        timeout: 60000,
        retries: 3
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

client.on("ready", () => {

    new DKRCommands(client, {
        commandsDir: path.join(__dirname, 'commands'),
        typescript: true,
        botOwners: ['410761741484687371', '470215458889662474'],
        testServers: [process.env.LOCAL_SERV_ID || '', process.env.FILEBIN_SERV_ID || '', process.env.MINEICE_SERV_ID || '']
    });
    
    info(`${wrap("Client ready", colors.LIGHT_YELLOW)}`);

    if (!fs.existsSync(process.env.CONFIG_PATH || "")) {
        error(`invalid config path!`);
        process.exit(1);
    }

    const data = YAML.parse(fs.readFileSync(process.env.CONFIG_PATH!).toString());
    chatActivityRatio = data.chatActivityRatio || 0;
    gameActivityRatio = data.gameActivityRatio || 0;

    if (!data.db.host || !data.db.port || !data.db.dbName || !data.db.login || !data.db.password || !data.tableName) {
        error(`invalid database config!`);
        process.exit(1);
    }

    tableName = data.tableName;

    dbConnection = mysql.createConnection({
        host: data.db.host,
        port: parseInt(data.db.port),
        database: data.db.dbName,
        user: data.db.login,
        password: data.db.password
    });

    info(`Connecting to the MySQL db ${wrap(data.db.dbName, colors.LIGHTER_BLUE)}`);
    dbConnection.connect(function (err) {
        if (err) {
            error(err);
            process.exit(2);
        }
        info(`Connected to the MySQL db ${wrap(data.db.dbName, colors.LIGHTER_BLUE)} on ${wrap(data.db.host, colors.LIGHT_GREEN)}`);
    });

    // every 10 minutes
    setInterval(function () {
        updateAllRanks(client);
    }, parseInt(process.env.RANK_UPDATE_INTERVAL_MINUTES || "10") * 60 * 1000);
});

client.login(process.env.TOKEN);
