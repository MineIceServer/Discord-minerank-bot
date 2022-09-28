import { colors, error, warn, wrap } from "discord_bots_common";
import { status as minestatus } from "minecraft-server-util";
import { minecraftServerUrl } from ".";

export async function getServerStatus() {

    if (!minecraftServerUrl) {
        warn(`${wrap("LOOKUP_SERVER", colors.LIGHT_YELLOW)} environment variable is not defined, can't get server status`);
        return undefined;
    }

    try {
        return await minestatus(minecraftServerUrl, 25565, {
            timeout: 1000 * 5 // timeout in milliseconds
        });
    } catch (err) {
        error(err);
        return undefined;
    }
}