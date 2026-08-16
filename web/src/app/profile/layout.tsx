import { SiteFrame } from "@/components/site-frame";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteFrame>{children}</SiteFrame>;
}
