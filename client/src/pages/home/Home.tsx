import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { HomeBottomSections, HomeFooter } from "./HomeBottom";
import { HomeNavigation, HomeTopSections } from "./HomeTop";

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (profileQuery.isLoading || profileQuery.isFetching) return;

    const profile = profileQuery.data;
    if (profile?.onboarding_complete || profile?.lora_status === "ready") {
      navigate("/dashboard");
    } else if (profile !== undefined) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, loading, navigate, profileQuery.data, profileQuery.isFetching, profileQuery.isLoading]);

  const handleCTA = () => {
    navigate(isAuthenticated ? "/dashboard" : "/sign-in");
  };

  const subscriptionCheckoutMutation = trpc.profile.createSubscriptionCheckout.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank"),
    onError: () => navigate("/sign-in"),
  });

  const handleMembershipCheckout = (annual: boolean) => {
    const MONTHLY_PRICE = "price_1TafvrPMV5P3vLteuAss2HQB";
    const ANNUAL_PRICE = "price_1TbNCKPMV5P3vLterPzZXdJ6";

    subscriptionCheckoutMutation.mutate({
      origin: window.location.origin,
      priceId: annual ? ANNUAL_PRICE : MONTHLY_PRICE,
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream text-charcoal">
      <HomeNavigation handleCTA={handleCTA} isAuthenticated={isAuthenticated} navigate={navigate} />
      <main>
        <HomeTopSections handleCTA={handleCTA} />
        <HomeBottomSections
          handleCTA={handleCTA}
          isAuthenticated={isAuthenticated}
          handleMembershipCheckout={handleMembershipCheckout}
          checkoutPending={subscriptionCheckoutMutation.isPending}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
        />
      </main>
      <HomeFooter />
    </div>
  );
}
