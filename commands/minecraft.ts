import { ICommand } from "dkrcommands";
import { colors, error, info, safeReply, wrap } from "discord_bots_common";
import { dbConnection, tableName } from "..";
import { calculareRank, updateUserRank } from "../role_utils";
import { ApplicationCommandOptionType } from "discord.js";

export default {
    category: "Ranking",
    description: "Attach discord to minecraft nickname",

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,
    
    options: [
        {
            name: "id",
            description: "The id you got from minecraft",
            //descriptionLocalizations: {
            //    ru: "ID, который вы получили из майнкрафта"
            //},
            required: true,
            type: ApplicationCommandOptionType.String,
        }
    ],

    callback: async ({ interaction, user }) => {

        const user_hash = interaction!.options.getString("id", true);

        if (user_hash.startsWith("id_")) {
            return safeReply(interaction, "❌ Invalid id", true);
        }

        dbConnection.query(`SELECT * from ${tableName} WHERE ds_id = '${user_hash}'`, 
        function (err, results) {
            const nickname = results[0]?.nickname || "";
            info(`📄 ${wrap(user.tag, colors.LIGHT_GREEN)} used 'minecraft' with id ${wrap(user_hash, colors.LIGHT_BLUE)}, got nickname: ${wrap(nickname, colors.LIGHTER_BLUE)}`);
            if (err || !nickname) {
                error(err);
                return safeReply(interaction, "❌ Invalid id", true);
            }

            dbConnection.query(`UPDATE ${tableName} SET ds_id = 'id_${user.id}' WHERE ds_id = '${user_hash}'`);
            safeReply(interaction, `📎 Successfully attached to ${nickname}`, true);
            try {
                updateUserRank(user.client, user.id, calculareRank(results[0].chat_activity, results[0].game_activity));
            } catch (err) {
                safeReply(interaction, `❌ Insufficient permissions: ${err}`, true);
            }
            
        });

    }
} as ICommand;