import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { onBoardUser } from "@/modules/auth/actions";
import { currentUserRole } from "@/modules/auth/actions";

export default async function Home() {
  await onBoardUser();
  const userRole = await currentUserRole();
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
     <UserButton />
    </div>
  );
}
