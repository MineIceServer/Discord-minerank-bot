import { ICommand } from "dkrcommands";
import { colors, error, info, safeReply, wrap } from "discord_bots_common";
import { dbConnection, getAllQuery } from "..";
import { calculareRank } from "../role_utils";
import { EmbedBuilder, Guild } from "discord.js";

function guildToString(guild: Guild | null): string {
    return `${guild?.id} (${wrap(guild?.name, colors.LIGHT_YELLOW)})`;
}

export default {
    category: 'Ranking',
    description: 'Display user leaderboard by rank',

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    callback: async ({ interaction, guild }) => {

        interaction?.deferReply();

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
                    const rank = calculareRank(entry.chat_activity, entry.game_activity);
                    let nickname;
                    try {
                        nickname = (await guild?.members.fetch(entry.ds_id.slice(3)))?.user.tag || "";
                    } catch (err) {
                        info(`🚫 User ${wrap(entry.ds_id, colors.LIGHT_GREEN)} ${wrap("not present", colors.LIGHT_RED)} in ${guildToString(guild)}`);
                        continue;
                    }
                    if (rank_map.has(rank)) {
                        rank_map.set(rank, `${rank_map.get(rank)}, ${nickname}`);
                        continue;
                    }
                    rank_map.set(rank, nickname);
                }

                const rank_map_sorted = new Map([...rank_map.entries()].sort((a, b) => b[0] - a[0]));

                let actual_users = 0;
                for (let entry of rank_map_sorted.entries()) {
                    if(entry[1]) {
                        embed.addFields([
                            {
                                name: `Rank ${entry[0]}`,
                                value: entry[1]
                            }
                        ]);
                        actual_users ++;
                    }
                }
                embed.setDescription(`${actual_users} users 👤`);

                safeReply(interaction!, embed);

            });

    }
} as ICommand