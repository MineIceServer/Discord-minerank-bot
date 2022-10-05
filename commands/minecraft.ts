import { ICommand } from "dkrcommands";
import { colors, info, safeReply, wrap } from "discord_bots_common";
import { tableName } from "..";
import { calculareRank, updateUserRank } from "../role_utils";
import { ApplicationCommandOptionType } from "discord.js";
import { selectByDiscordId, sqlQuery } from "../utis";

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

        const res = await selectByDiscordId(user_hash);

        const nickname = res.results[0]?.nickname || "";
        info(`📄 ${wrap(user.tag, colors.LIGHT_GREEN)} used 'minecraft' with id ${wrap(user_hash, colors.LIGHT_BLUE)}, got nickname: ${wrap(nickname, colors.LIGHTER_BLUE)}`);
        
        if (res.error || !nickname) {
            return safeReply(interaction, "❌ Invalid id", true);
        }

        const update_res = await sqlQuery(`UPDATE ${tableName} SET ds_id = 'id_${user.id}' WHERE ds_id = '${user_hash}'`);

        if (update_res.error) {
            return safeReply(interaction, "❌ An error ocurred", true);
        }

        await safeReply(interaction, `📎 Successfully attached to ${nickname}`, true);
        await updateUserRank(user.client, user.id, calculareRank(res.results[0].chat_activity, res.results[0].game_activity));

    }
} as ICommand;