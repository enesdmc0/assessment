"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		const token = localStorage.getItem("auth_token");

		if (!token) {
			router.push("/auth/login");
		} else {
			setIsChecking(false);
		}
	}, [router]);

	if (isChecking) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
