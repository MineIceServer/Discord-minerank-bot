import { ICommand } from "dkrcommands";
import { ApplicationCommandOptionType } from "discord.js";
import { dbConnection, tableName } from "..";
import { error, safeReply } from "discord_bots_common";

export default {
    category: 'Ranking',
    description: 'Display minecraft nicknames assiciated with a given user',

    slash: true,
    testOnly: true,
    ownerOnly: true,
    hidden: true,

    options: [
        {
            name: 'member',
            description: 'Server member',
            //descriptionLocalizations: {
            //    ru: "ID, который вы получили из майнкрафта"
            //},
            required: true,
            type: ApplicationCommandOptionType.User,
        }
    ],

    callback: async ({ interaction }) => {

        let interaction_nn = interaction!;

        dbConnection.query(`SELECT * from ${tableName} WHERE ds_id = 'id_${interaction_nn.options.getUser("member")?.id || ""}'`,
            function (err, results) {

                if (err) {
                    error(err);
                    safeReply(interaction_nn, "❌ Sql error ocurred", true);
                    return;
                }

                if(results.length) {
                    let message = "🖇 Associated minecraft nicknames:";
                    for(const result of results) {
                        message += ` ${result.nickname}`;
                    }
                    safeReply(interaction_nn, message, true);
                } else {
                    safeReply(interaction_nn, "🚫 No associated minecraft nicknames", true);
                }

            });

    }
} as ICommand