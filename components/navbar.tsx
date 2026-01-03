import { UserButton } from "@clerk/nextjs";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b bg-white">
      <div className="font-bold text-xl">Sticky Sync</div>

      <div className="flex items-center gap-4">
        {/* Ispe click karte hi saare profile options aa jayenge ✨ */}
        <UserButton />
      </div>
    </nav>
  );
}
