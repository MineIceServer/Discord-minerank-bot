import { ICommand } from "dkrcommands";
import { ApplicationCommandOptionType, ColorResolvable } from "discord.js";
import { selectByDiscordId } from "../utils/utils";
import { readClansConfig } from "../utils/clan_utils";

import { colors, wrap } from "discord_bots_common/dist/utils/colors";
import { info, error } from "discord_bots_common/dist/utils/logger";
import { safeReply } from "discord_bots_common/dist/utils/utils";

export default {
    category: "Clans",
    description: "Set your clan color",

    slash: true,
    testOnly: true,
    ownerOnly: false,
    hidden: false,

    options: [
        {
            name: "color",
            description: "New color (hex or name)",
            required: true,
            type: ApplicationCommandOptionType.String
        },
        {
            name: "clan",
            description: "Your clan",
            required: true,
            type: ApplicationCommandOptionType.Role
        }
    ],

    callback: async ({ interaction, user, guild }) => {

        const new_color = interaction!.options.getString("color", true);
        const clan_role = interaction!.options.getRole("clan", true);

        if (!clan_role.name.startsWith("Clan")) {
            return safeReply(interaction, "🚫 That does not look like a clan, clan roles start with 'Clan'", true);
        }

        const clans = readClansConfig();
        if (!clans) {
            return safeReply(interaction, "❌ An error ocurred", true);
        }

        try {

            const res = await selectByDiscordId(`id_${user.id}`);

            if (res.error) {
                return safeReply(interaction, "❌ An error occurred", true);
            }

            if (!res.nicknames.length) {
                return safeReply(interaction, "❌ Your discord account is not attached to any minecraft account, use `/minecraft` to attach", true);
            }

            info(`📄 ${wrap(user.tag, colors.LIGHT_GREEN)} used 'clan_color' with color ${wrap(new_color, colors.LIGHT_BLUE)}`);

            let owns = false;
            let exists = false;
            for (const uuid of res.uuids) {
                if (uuid in clans) {
                    exists = true;
                    if (`Clan '${clans[uuid].clanFinalName}'` == clan_role.name) {
                        owns = true;
                        break;
                    }
                }
            }

            if (!exists) {
                return safeReply(interaction, "❌ You don't own any clans", true);
            }

            if (!owns) {
                return safeReply(interaction, "❌ You are not the owner of the clan", true);
            }

            (await guild?.roles.fetch())?.get(clan_role.id)?.edit({ color: new_color as ColorResolvable });

            safeReply(interaction, `🎨 Updated color, new color: ${new_color}`, true);

        } catch (err) {
            error(err);
            return safeReply(interaction, "❌ Invalid color", true);
        }

    }
} as ICommand;