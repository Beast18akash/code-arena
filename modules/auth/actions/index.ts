"use server"
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function onBoardUser() {
    try {
        const user = await currentUser();
        if (!user) {
            throw new Error("User not found");
        }

   const { id , emailAddresses, firstName, lastName, imageUrl } = user;
   const newUser = await prisma.user.upsert({
            where: { clerkId: id  },
            update: {
                email: emailAddresses[0].emailAddress,
                firstName: firstName || null,
                lastName: lastName || null,
                imageUrl: imageUrl || null
            },
            create: {
                clerkId: id,
                email: emailAddresses[0].emailAddress,
                firstName: firstName || null,
                lastName: lastName || null,
                imageUrl: imageUrl || null
            }
        });

        return newUser;
    } catch (error) {
        console.error("Error onboarding user:", error);
        throw new Error("Failed to onboard user");
    }
}

export const currentUserRole = async () => {
    try {
        const user = await currentUser();
        if (!user) {
            throw new Error("User not found");
        }
        const {id} = user;
        const userRole = await prisma.user.findUnique({
            where: { clerkId: id },
            select: { role: true }
        });
        return userRole?.role;
    } catch (error) {
        console.error("Error fetching user role:", error);
        throw new Error("Failed to fetch user role");
    }
}

//  export const getCurrentUserData = async () => {
    // try {
    //     const user = await currentUser();
    //     if (!user) {
    //         throw new Error("User not found");
    //     }
    //     const { id } = user;
    //     const userData = await prisma.user.findUnique({
    //         where: { clerkId: id },
    //         select: { firstName: true, lastName: true, email: true }
    //     });
    //     return userData;
    // } catch (error) {
    //     console.error("Error fetching current user data:", error);
    //     throw new Error("Failed to fetch current user data");
    // }
// };