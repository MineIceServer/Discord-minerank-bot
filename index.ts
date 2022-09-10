import { join } from "path";
import { Client, GatewayIntentBits } from "discord.js";
import DKRCommands from "dkrcommands";
import * as mysql from "mysql";
import { colors, error, info, wrap } from "discord_bots_common";

const client = new Client({
    rest: {
        timeout: 60000,
        retries: 3
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

client.on("ready", () => {
    new DKRCommands(client, {
        // The name of the local folder for your command files
        commandsDir: join(__dirname, "commands"),
        // Allow importing of .ts files if you are using ts-node
        typeScript: true
    });
    
    if (!process.env.DATABASE_HOST || !process.env.DATABASE_USER || !process.env.DATABASE_PASSWORD || !process.env.DATABASE_NAME) {
        error(`invalid dtabase config!`);
        process.exit(1);
    }

    let dbConnection = mysql.createConnection({
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME
    });

    dbConnection.connect(function (err) {
        if (err) {
            error(err);
            process.exit(2);
        }
        info(`Connected to the MySQL db ${wrap(process.env.DATABASE_NAME, colors.LIGHTER_BLUE)} on ${wrap(process.env.DATABASE_HOST, colors.LIGHT_GREEN)}`);
    });

});

client.login("BOT_TOKEN_HERE");
