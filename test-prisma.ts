import { prisma } from "./lib/db";

async function main() {
    try {
        await prisma.user.findFirst();
        console.log("Success");
    } catch (e) {
        console.error("Prisma error:", e);
    }
}

main();
