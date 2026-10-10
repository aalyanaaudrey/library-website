import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ProfileForms } from "@/components/account/profile-forms";

export const metadata: Metadata = { title: "Profile & password" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <ProfileForms
      profile={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        memberNo: user.memberNo,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
