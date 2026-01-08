"use client";

import Navbar from "@/components/navbar";
import { usePathname } from "next/navigation";

export default function ShowNavbar() {

  const pathname = usePathname();
  const isRoom = pathname.startsWith("/room");


  return !isRoom ? (
    <div>
      <Navbar />
    </div>
  ) : null;
}
