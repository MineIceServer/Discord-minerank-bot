import { ICommand } from "dkrcommands";
import { ApplicationCommandOptionType, GuildMember, Role, User } from "discord.js";
import { selectByDiscordId } from "../utils/utils";
import { safeReply } from "discord_bots_common/dist/utils/utils";

async function getMinecraftNicknamesById(id: string) {

    const res = await selectByDiscordId(`id_${id}`);

    if (res.error) {
        return { message: "❌ An error ocurred", error: true };
    }

    if (res.nicknames.length) {
        let message = "🖇 Associated minecraft nicknames:";
        for (const nickname of res.nicknames) {
            message += ` \`${nickname}\``;
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