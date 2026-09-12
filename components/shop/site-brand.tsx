import Image from "next/image";
import Link from "next/link";
import { STORE } from "@/lib/store";
import logo from "@/public/images/logo.png";

export function SiteBrand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${STORE.name} — início`}
      className={`inline-flex items-center gap-2 whitespace-nowrap transition-opacity duration-150 ease-out hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className="relative size-8 shrink-0 overflow-hidden">
        <Image
          src={logo}
          alt=""
          fill
          sizes="32px"
          className="scale-[1.9] object-contain"
        />
      </span>
      <span>{STORE.name}</span>
    </Link>
  );
}
