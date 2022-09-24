import { ICommand } from "dkrcommands";
import { error, safeReply } from "discord_bots_common";
import { dbConnection, tableName } from "..";
import { calculareRank } from "../role_utils";
import { EmbedBuilder } from "discord.js";
import fs from 'fs';
import YAML from 'yaml'
import { getClanInfo } from "../clan_utils";
import { setOrAppendToRankMap, sortAndConstructRankMap } from "../utis";

export default {
    category: 'Ranking',
    description: 'Display clan leaderboard by rank',

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    callback: async ({ interaction }) => {

        await interaction?.deferReply();

        let clans: any;
        try {
            clans = YAML.parse(fs.readFileSync(process.env.CLAN_PLUGIN_CONFIG_PATH!).toString()).clans.data;
        } catch (err) {
            error(err);
            return;
        }

        let allClans: {clanName: string, clan_members: string[]}[]= [];

        for(const clan_id in clans) {
            allClans.push(getClanInfo(clans, clan_id));
        }

        dbConnection.query(`select * from ${tableName}`,
            async function (err, results) {

                if (err) {
                    error(err);
                    safeReply(interaction!, "❌ Sql error ocurred");
                    return;
                }

                let embed = new EmbedBuilder();
                embed.setColor("DarkAqua");
                embed.setTitle(`🏆 Clan Leaderboard`);

                let rank_map = new Map<number, string>();
                let total_users = 0;

                for (const clan_data of allClans) {

                    let total_chat_activity = 0;
                    let total_game_activity = 0;

                    for (let entry of results) {
                        if (clan_data.clan_members.includes(entry.uuid)) {
                            total_chat_activity += entry.chat_activity;
                            total_game_activity += entry.game_activity;
                        }
                    }
                    
                    total_users += clan_data.clan_members.length;
                    
                    setOrAppendToRankMap(rank_map, 
                        calculareRank(total_chat_activity, total_game_activity), 
                        `${clan_data.clanName} (${clan_data.clan_members.length})`);
                }

                await safeReply(interaction!, sortAndConstructRankMap(embed, rank_map, total_users));

            });

    }
} as ICommand