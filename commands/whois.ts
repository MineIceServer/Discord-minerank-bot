import { ICommand } from "dkrcommands";
import { ApplicationCommandOptionType, GuildMember, Role, User } from "discord.js";
import { tableName } from "..";
import { error, safeReply } from "discord_bots_common";
import { syncQuery } from "../utis";

async function getMinecraftNicknamesById(id: string) {

    const res = await syncQuery(`SELECT * from ${tableName} WHERE ds_id = 'id_${id}'`);

    if (res.error) {
        error(res.error);
        return { message: "❌ Sql error ocurred", error: true };
    }

    if (res.results.length) {
        let message = "🖇 Associated minecraft nicknames:";
        for (const result of res.results) {
            message += ` \`${result.nickname}\``;
        }
        return { message: message };
    } else {
        return { message: "🚫 No associated minecraft nicknames", error: true };
    }
}

export default {
    category: "Administration",
    description: "Display minecraft nicknames assiciated with a given user",

    slash: true,
    testOnly: true,
    ownerOnly: true,
    hidden: true,

    options: [
        {
            name: "member",
            description: "Server member",
            //descriptionLocalizations: {
            //    ru: "ID, который вы получили из майнкрафта"
            //},
            required: true,
            type: ApplicationCommandOptionType.Mentionable,
        }
    ],

    callback: async ({ interaction, guild }) => {

        const mentionable = interaction!.options.getMentionable("member", true);
        if (mentionable instanceof User || mentionable instanceof GuildMember) {
            await safeReply(interaction, (await getMinecraftNicknamesById(mentionable.id)).message, true);
        } else if (mentionable instanceof Role) {

            let str = `--stats of role ${mentionable.name}--`;
            const all_members = await guild?.members.fetch();
            let access_members = 0;
            if (all_members) {
                for (const [, member] of all_members) {
                    if (member.roles.cache.has(mentionable.id)) {
                        const nicknames = await getMinecraftNicknamesById(member.id);
                        if (!nicknames.error) {
                            if (str.length + nicknames.message.length < 1900) {
                                str += `\n${member.user.tag}: ${nicknames.message}`;
                            } else {
                                access_members++;
                            }
                        }
                    }
                }
            }

            if (access_members > 0) {
                str += `... + ${access_members} more members`;
            }

            await safeReply(interaction, str, true);
        }

    }
} as ICommand;