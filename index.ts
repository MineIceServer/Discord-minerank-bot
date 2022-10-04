import * as mysql from "mysql";
import YAML from "yaml";
import { colors, dkrInit, error, getClient, getEnvironmentVar, guildToString, info, stripUrlScheme, testEnvironmentVar, wrap } from "discord_bots_common";

import dotenv from "dotenv"; // evironment vars
import fs from "fs";
import { updateAllRanks } from "./role_utils";
import { getServerStatus } from "./status_utils";
import { updateAllClans } from "./clan_utils";

dotenv.config();

export let tableName: string;
export let getAllQuery: string;
export let chatActivityRatio: number;
export let gameActivityRatio: number;
export let dbConnection: mysql.Connection;
export const minecraftServerUrl = stripUrlScheme(getEnvironmentVar("LOOKUP_SERVER"));

const client = getClient();

client.on("ready", () => {

    testEnvironmentVar("TOKEN", true);
    testEnvironmentVar("TEST_SERVERS", true);
    testEnvironmentVar("OWNERS", false);
    testEnvironmentVar("LOOKUP_SERVER", false);
    testEnvironmentVar("RANK_UPDATE_INTERVAL_MINUTES", false);
    testEnvironmentVar("RANK_PLUGIN_CONFIG_PATH", true, true);
    testEnvironmentVar("CLAN_PLUGIN_CONFIG_PATH", false, true);
    testEnvironmentVar("CLAN_CHANNELS_CATEGORY", false);

    dkrInit(client, __dirname);
    
    const data = YAML.parse(fs.readFileSync(getEnvironmentVar("RANK_PLUGIN_CONFIG_PATH")).toString());
    chatActivityRatio = data.chatActivityRatio || 0;
    gameActivityRatio = data.gameActivityRatio || 0;

    if (!data.db.host || !data.db.port || !data.db.dbName || !data.db.login || !data.db.password || !data.tableName) {
        error(`invalid database config!`);
        process.exit(1);
    }

    tableName = data.tableName;
    getAllQuery = `SELECT ds_id, group_concat(nickname separator ', ') as nickname, SUM(chat_activity) as chat_activity, SUM(game_activity) as game_activity FROM ${tableName} WHERE ds_id IS NOT null GROUP BY ds_id`;

    dbConnection = mysql.createConnection({
        host: data.db.host,
        port: parseInt(data.db.port),
        database: data.db.dbName,
        user: data.db.login,
        password: data.db.password
    });

    info(`🔶 Connecting to the MySQL db ${wrap(data.db.dbName, colors.LIGHTER_BLUE)}`);
    dbConnection.connect(function (err) {
        if (err) {
            error(err);
            process.exit(2);
        }
        info(`🟩 Connected to the MySQL db ${wrap(data.db.dbName, colors.LIGHTER_BLUE)} on ${wrap(data.db.host, colors.LIGHT_GREEN)}`);
    });

    // every 10 minutes
    setInterval(async function () {

        info(wrap("Updating presence", colors.PURPLE));

        const status = await getServerStatus();
        if (status) {
            client.user?.setPresence({
                status: "online",
                activities: [{
                    name: `${status.motd.clean} - ${status.players.online}/${status.players.max} players online`,
                    url: `https://${minecraftServerUrl}`
                }]
            });
        }      

        const guilds = await client.guilds.fetch();
        info(`\n🪧 Currently serving ${guilds.size} guilds: `);
        for (const guild of guilds) {
            info(guildToString(guild));
        }

        // update ranks
        await updateAllRanks(client);
        // update clans
        await updateAllClans(client);
    }, parseInt(getEnvironmentVar("RANK_UPDATE_INTERVAL_MINUTES", "10")) * 60 * 1000);
});

client.login(process.env.TOKEN);
