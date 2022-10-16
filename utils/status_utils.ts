import { colors, wrap } from "discord_bots_common/dist/utils/colors";
import { error, warn } from "discord_bots_common/dist/utils/logger";
import { status as minestatus } from "minecraft-server-util";
import { minecraftServerUrl } from "..";

export async function getServerStatus() {

    if (!minecraftServerUrl) {
        return warn(`${wrap("LOOKUP_SERVER", colors.LIGHT_YELLOW)} environment variable is not defined, can't get server status`);
    }

    try {
        return await minestatus(minecraftServerUrl, 25565, {
            timeout: 1000 * 5 // timeout in milliseconds
        });
    } catch (err) {
        return error(err);
    }
}