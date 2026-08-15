import { SiteFrame } from "@/components/site-frame";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteFrame>{children}</SiteFrame>;
}
