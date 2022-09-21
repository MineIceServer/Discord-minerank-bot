import { EmbedBuilder } from "discord.js";

export function sortAndConstructRankMap(embed: EmbedBuilder, rank_map: Map<number, string>, count_members?: boolean, member_count?: number) {
    const rank_map_sorted = new Map([...rank_map.entries()]
        .sort((a, b) => (isNaN(b[0]) ? 10000 : b[0]) - (isNaN(a[0]) ? 10000 : a[0])));

    let total_users = member_count || 0;

    for (const [rank, members] of rank_map_sorted) {
        if (members) {
            embed.addFields([
                {
                    name: `Rank ${rank}`,
                    value: members
                }
            ]);
            if (count_members) {
                total_users++;
            }
        }
    }
    embed.setDescription(`${total_users} users 👤`);
    return embed;
}

export function setOrAppendToRankMap(rank_map: Map<number, string>, rank: number, data: string) {
    if (rank_map.has(rank)) {
        rank_map.set(rank, `${rank_map.get(rank)}, ${data}`);
        return;
    }
    rank_map.set(rank, data);
}