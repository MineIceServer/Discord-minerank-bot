import { ICommand } from "dkrcommands";
import { error, safeReply } from "discord_bots_common";
import { dbConnection, getAllQuery } from "..";
import { calculareRank, tryToGetMember } from "../role_utils";
import { EmbedBuilder } from "discord.js";
import { setOrAppendToRankMap, sortAndConstructRankMap } from "../utis";

export default {
    category: 'Ranking',
    description: 'Display user leaderboard by rank',

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    callback: async ({ interaction, guild }) => {

        await interaction?.deferReply();

        dbConnection.query(getAllQuery,
            async function (err, results) {

                if(err) {
                    error(err);
                    safeReply(interaction!, "❌ Sql error ocurred");
                    return;
                }

                let embed = new EmbedBuilder();
                embed.setColor("DarkAqua");
                embed.setTitle(`🏆 Leaderboard`);

                let rank_map = new Map<number, string>();

                for(let entry of results) {
                    setOrAppendToRankMap(rank_map, 
                        calculareRank(entry.chat_activity, entry.game_activity), 
                        (await tryToGetMember(guild!, entry.ds_id.slice(3)))?.user.tag || "");
                }

                await safeReply(interaction!, sortAndConstructRankMap(embed, rank_map, true));

            });

    }
} as ICommand