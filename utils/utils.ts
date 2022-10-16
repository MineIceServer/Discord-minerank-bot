import { EmbedBuilder } from "discord.js";
import { error } from "discord_bots_common/dist/utils/logger";
import { MysqlError } from "mysql";
import { dbConnection, tableName } from "..";
import { calculareRank } from "./role_utils";

export function sortAndConstructRankMap(embed: EmbedBuilder, rank_map: Map<number, string>, member_count: number) {
    const rank_map_sorted = new Map([...rank_map.entries()]
        .sort((a, b) => (isNaN(b[0]) ? 10000 : b[0]) - (isNaN(a[0]) ? 10000 : a[0])));

    for (const [rank, members] of rank_map_sorted) {
        if (members) {
            embed.addFields([{
                name: `Rank ${rank}`,
                value: members
            }
            ]);
        }
    }
    embed.setDescription(`${member_count} users 👤`);
    return embed;
}

export function setOrAppendToRankMap(rank_map: Map<number, string>, rank: number, data: string): number {
    if (data) {
        if (rank_map.has(rank)) {
            rank_map.set(rank, `${rank_map.get(rank)}, ${data}`);
        } else {
            rank_map.set(rank, data);
        }
        return 1;
    }
    return 0;
}

export async function selectByDiscordId(id: string) {
    const res = await sqlQuery(`SELECT * FROM ${tableName} WHERE ds_id='${id}'`);
    if (res.error) {
        return { error: res.error };
    }
    const nicknames: string[] = [];
    const uuids: string[] = [];
    let total_game_activity = 0;
    let total_chat_activity = 0;
    for (const entry of res.results) {
        nicknames.push(entry.nickname);
        uuids.push(entry.uuid);
        total_game_activity += entry.game_activity;
        total_chat_activity += entry.chat_activity;
    }
    
    return { nicknames: nicknames, uuids: uuids, rank: calculareRank(total_chat_activity, total_game_activity) };
}

export function sqlQuery(query: string) {
    return new Promise<{ results?: any, error: MysqlError | null }>(resolve => {
        dbConnection.query(query,
            function (err, results) {
                if (err) {
                    error(`❌ An sql error ocurred while executing query: ${query} | error: ${err}`);
                }
                resolve({ results: results, error: err });
            });
    });
}
