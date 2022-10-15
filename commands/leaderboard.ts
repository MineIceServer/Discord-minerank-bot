import { ICommand } from "dkrcommands";
import { getAllQuery } from "..";
import { calculareRank } from "../role_utils";
import { EmbedBuilder } from "discord.js";
import { setOrAppendToRankMap, sortAndConstructRankMap, sqlQuery } from "../utis";
import { tryToGetMember } from "discord_bots_common/dist/utils/guild_utils";
import { safeReply } from "discord_bots_common/dist/utils/utils";

export default {
    category: "Ranking",
    description: "Display user leaderboard by rank",

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    callback: async ({ interaction, guild }) => {

        await interaction?.deferReply();

        const res = await sqlQuery(getAllQuery);

        if (res.error) {
            return safeReply(interaction, "❌ An error ocurred");
        }

        const embed = new EmbedBuilder();
        embed.setColor("DarkAqua");
        embed.setTitle(`🏆 Leaderboard`);

        const rank_map = new Map<number, string>();
        let total_members = 0;

        for (const entry of res.results) {
            total_members += setOrAppendToRankMap(rank_map,
                calculareRank(entry.chat_activity, entry.game_activity),
                (await tryToGetMember(guild!, entry.ds_id.slice(3)))?.user.tag || "");
        }

        await safeReply(interaction, sortAndConstructRankMap(embed, rank_map, total_members));
    }
} as ICommand;